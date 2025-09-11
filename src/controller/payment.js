const { snap, coreApi } = require("../config/midtrans");
const { successResponse, errorResponse } = require("../utils/response");
const { generateOrderId } = require("../utils/auth");
const prisma = require("../config/database");
const { validationResult } = require("express-validator");

// Buat pembayaran untuk konsultasi
const createPayment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    const { consultationId } = req.body;
    const userId = req.user.id;

    // Cek konsultasi dan pastikan user adalah pasien dari konsultasi ini
    const consultation = await prisma.consultation.findFirst({
      where: {
        id: consultationId,
        patientId: userId,
      },
      include: {
        doctor: {
          include: {
            doctorProfile: true,
          },
        },
        patient: true,
        payment: true,
      },
    });

    if (!consultation) {
      return errorResponse(res, "Consultation not found", 404);
    }

    // Cek apakah sudah ada pembayaran
    if (consultation.payment) {
      return errorResponse(
        res,
        "Payment already exists for this consultation",
        400
      );
    }

    // Ambil biaya konsultasi dari profil dokter
    const amount = consultation.doctor.doctorProfile.consultationFee;
    const orderId = generateOrderId();

    // Parameter untuk Midtrans
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: parseInt(amount),
      },
      customer_details: {
        first_name: consultation.patient.fullname,
        email: consultation.patient.email,
        phone: consultation.patient.phone || "",
      },
      item_details: [
        {
          id: consultationId,
          price: parseInt(amount),
          quantity: 1,
          name: `Konsultasi dengan Dr. ${consultation.doctor.fullname}`,
          category: "Medical Consultation",
        },
      ],
      callbacks: {
        finish: `${process.env.CLIENT_URL}/payment/finish`,
        error: `${process.env.CLIENT_URL}/payment/error`,
        pending: `${process.env.CLIENT_URL}/payment/pending`,
      },
    };

    // Buat transaksi di Midtrans
    const transaction = await snap.createTransaction(parameter);

    // Simpan data pembayaran ke database
    const payment = await prisma.payment.create({
      data: {
        consultationId,
        userId,
        amount,
        midtransOrderId: orderId,
        midtransResponse: transaction,
      },
    });

    return successResponse(
      res,
      {
        payment,
        snapToken: transaction.token,
        snapRedirectUrl: transaction.redirect_url,
      },
      "Payment created successfully",
      201
    );
  } catch (error) {
    console.error("Create payment error:", error);
    return errorResponse(res, "Failed to create payment", 500);
  }
};

// Webhook dari Midtrans untuk update status pembayaran
const midtransWebhook = async (req, res) => {
  try {
    const notification = req.body;

    // Verify notification dari Midtrans
    const statusResponse = await coreApi.transaction.notification(notification);

    const orderId = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;

    console.log(
      `Transaction notification received. Order ID: ${orderId}. Transaction status: ${transactionStatus}. Fraud status: ${fraudStatus}`
    );

    // Cari payment berdasarkan order_id
    const payment = await prisma.payment.findFirst({
      where: {
        midtransOrderId: orderId,
      },
      include: {
        consultation: true,
      },
    });

    if (!payment) {
      return errorResponse(res, "Payment not found", 404);
    }

    let paymentStatus = "PENDING";
    let paidAt = null;

    // Update status berdasarkan response dari Midtrans
    if (transactionStatus === "capture") {
      if (fraudStatus === "accept") {
        paymentStatus = "PAID";
        paidAt = new Date();
      }
    } else if (transactionStatus === "settlement") {
      paymentStatus = "PAID";
      paidAt = new Date();
    } else if (
      transactionStatus === "cancel" ||
      transactionStatus === "deny" ||
      transactionStatus === "expire"
    ) {
      paymentStatus = "FAILED";
    } else if (transactionStatus === "pending") {
      paymentStatus = "PENDING";
    } else if (transactionStatus === "refund") {
      paymentStatus = "REFUNDED";
    }

    // Update payment status
    const updatedPayment = await prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: paymentStatus,
        transactionId: statusResponse.transaction_id,
        paymentMethod: statusResponse.payment_type,
        paidAt,
        midtransResponse: statusResponse,
      },
    });

    // Jika pembayaran berhasil, update status konsultasi
    if (paymentStatus === "PAID") {
      await prisma.consultation.update({
        where: {
          id: payment.consultationId,
        },
        data: {
          status: "PENDING", // Siap untuk diambil dokter
        },
      });
    }

    return res.status(200).json({ status: "success" });
  } catch (error) {
    console.error("Midtrans webhook error:", error);
    return res.status(500).json({ status: "error" });
  }
};

// Cek status pembayaran
const checkPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const payment = await prisma.payment.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        consultation: {
          include: {
            doctor: {
              select: {
                id: true,
                fullname: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      return errorResponse(res, "Payment not found", 404);
    }

    // Jika status masih pending, cek ke Midtrans
    if (payment.status === "PENDING" && payment.midtransOrderId) {
      try {
        const statusResponse = await coreApi.transaction.status(
          payment.midtransOrderId
        );

        let newStatus = payment.status;
        let paidAt = payment.paidAt;

        if (
          statusResponse.transaction_status === "settlement" ||
          (statusResponse.transaction_status === "capture" &&
            statusResponse.fraud_status === "accept")
        ) {
          newStatus = "PAID";
          paidAt = new Date();
        } else if (
          statusResponse.transaction_status === "cancel" ||
          statusResponse.transaction_status === "deny" ||
          statusResponse.transaction_status === "expire"
        ) {
          newStatus = "FAILED";
        }

        // Update jika ada perubahan status
        if (newStatus !== payment.status) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: newStatus,
              paidAt,
              transactionId: statusResponse.transaction_id,
              paymentMethod: statusResponse.payment_type,
              midtransResponse: statusResponse,
            },
          });

          payment.status = newStatus;
          payment.paidAt = paidAt;
        }
      } catch (midtransError) {
        console.error("Error checking Midtrans status:", midtransError);
      }
    }

    return successResponse(
      res,
      payment,
      "Payment status retrieved successfully"
    );
  } catch (error) {
    console.error("Check payment status error:", error);
    return errorResponse(res, "Failed to check payment status", 500);
  }
};

// Get history pembayaran user
const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const whereClause = { userId };
    if (status) {
      whereClause.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        consultation: {
          include: {
            doctor: {
              select: {
                id: true,
                fullname: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: parseInt(limit),
    });

    const totalCount = await prisma.payment.count({
      where: whereClause,
    });

    return successResponse(
      res,
      {
        payments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          limit: parseInt(limit),
        },
      },
      "Payment history retrieved successfully"
    );
  } catch (error) {
    console.error("Get payment history error:", error);
    return errorResponse(res, "Failed to get payment history", 500);
  }
};

module.exports = {
  createPayment,
  midtransWebhook,
  checkPaymentStatus,
  getPaymentHistory,
};
