// Response formatter utility
const successResponse = (
  res,
  data = null,
  message = "Success",
  statusCode = 200
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

const errorResponse = (
  res,
  message = "Internal Server Error",
  statusCode = 500,
  errors = null
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString(),
  });
};

// Validation error formatter
const validationErrorResponse = (res, errors) => {
  const formattedErrors = errors.map((error) => ({
    field: error.path,
    message: error.msg,
  }));

  return errorResponse(res, "Validation failed", 400, formattedErrors);
};

module.exports = {
  successResponse,
  errorResponse,
  validationErrorResponse,
};
