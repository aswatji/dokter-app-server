# Doctor Consultation API

API backend untuk aplikasi konsultasi dokter dengan fitur chat real-time dan pembayaran menggunakan Midtrans.

## 🚀 Fitur Utama

- **Authentication & Authorization** - JWT-based dengan role-based access
- **User Management** - Admin, Doctor, dan Patient roles
- **Real-time Chat** - Socket.IO untuk chat konsultasi
- **Payment Integration** - Midtrans untuk pembayaran konsultasi
- **File Upload** - Upload gambar, audio, dan dokumen
- **Doctor Profiles** - Manajemen profil dokter dan spesialisasi
- **Consultation Management** - Sistem manajemen konsultasi end-to-end

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL dengan Prisma ORM
- **Real-time**: Socket.IO
- **Payment**: Midtrans
- **Authentication**: JWT + bcryptjs
- **File Upload**: Multer
- **Security**: Helmet, CORS, Rate Limiting

## 📋 Prerequisites

- Node.js (v18 atau lebih tinggi)
- PostgreSQL database
- Akun Midtrans (untuk payment gateway)

## ⚡ Quick Start

### 1. Clone dan Install Dependencies

```bash
git clone <repository-url>
cd dokter-consultation-api
npm install
```

### 2. Setup Environment Variables

Salin file `.env` dan sesuaikan konfigurasi:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/dokter_app_db"

# Server
PORT=4000
NODE_ENV=development

# JWT
JWT_SECRET=your_super_secret_jwt_key_here_make_it_very_long_and_secure
JWT_EXPIRES_IN=7d

# Midtrans Configuration
MIDTRANS_SERVER_KEY=your_midtrans_server_key_here
MIDTRANS_CLIENT_KEY=your_midtrans_client_key_here
MIDTRANS_IS_PRODUCTION=false

# File Upload
MAX_FILE_SIZE=5000000
UPLOAD_PATH=./uploads

# Client URL (untuk CORS dan callbacks)
CLIENT_URL=http://localhost:3000
```

### 3. Setup Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema ke database
npm run db:push

# Atau jalankan migrations
npm run db:migrate

# Seed database dengan data awal
npm run db:seed
```

### 4. Jalankan Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

Server akan berjalan di `http://localhost:4000`

## 📚 API Documentation

### 🔐 Authentication

#### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "fullname": "John Doe",
  "phone": "+6281234567890",
  "role": "PATIENT" // PATIENT, DOCTOR, ADMIN
}
```

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### 👨‍⚕️ Consultations

#### Create Consultation

```http
POST /api/consultations
Authorization: Bearer <token>
Content-Type: application/json

{
  "doctorId": "doctor_id_here",
  "title": "Konsultasi Demam",
  "description": "Sudah 3 hari demam tinggi"
}
```

#### Get My Consultations

```http
GET /api/consultations?status=ACTIVE&page=1&limit=10
Authorization: Bearer <token>
```

### 💬 Messages

#### Send Message

```http
POST /api/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "consultationId": "consultation_id_here",
  "content": "Halo dokter, saya ingin konsultasi",
  "messageType": "TEXT"
}
```

#### Get Messages

```http
GET /api/messages/consultation/{consultationId}?page=1&limit=50
Authorization: Bearer <token>
```

### 💳 Payments

#### Create Payment

```http
POST /api/payments
Authorization: Bearer <token>
Content-Type: application/json

{
  "consultationId": "consultation_id_here"
}
```

#### Check Payment Status

```http
GET /api/payments/{paymentId}/status
Authorization: Bearer <token>
```

### 📁 File Upload

#### Upload File

```http
POST /api/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <selected_file>
```

## 🔌 Socket.IO Events

### Client Events

```javascript
// Connect dengan authentication
const socket = io("http://localhost:4000", {
  auth: {
    token: "your_jwt_token_here",
  },
});

// Join consultation rooms
socket.emit("join-consultations");

// Join specific consultation
socket.emit("join-consultation", consultationId);

// Send typing indicator
socket.emit("typing", {
  consultationId: "consultation_id",
  isTyping: true,
});
```

### Server Events

```javascript
// Listen for new messages
socket.on("new-message", (message) => {
  console.log("New message:", message);
});

// Listen for typing indicators
socket.on("user-typing", (data) => {
  console.log(`${data.userName} is typing...`);
});

// Listen for consultation status updates
socket.on("consultation-status-updated", (data) => {
  console.log("Consultation status changed:", data);
});
```

## 🗃️ Database Schema

### Users

- **PATIENT**: Pasien yang melakukan konsultasi
- **DOCTOR**: Dokter yang memberikan layanan konsultasi
- **ADMIN**: Administrator sistem

### Consultations

- **PENDING**: Menunggu konfirmasi dokter
- **ACTIVE**: Sedang berlangsung
- **COMPLETED**: Selesai
- **CANCELLED**: Dibatalkan

### Payments

- **PENDING**: Menunggu pembayaran
- **PAID**: Sudah dibayar
- **FAILED**: Pembayaran gagal
- **REFUNDED**: Dikembalikan

## 🔧 Scripts

```bash
npm run dev          # Jalankan development server
npm run start        # Jalankan production server
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema ke database
npm run db:migrate   # Jalankan database migrations
npm run db:studio    # Buka Prisma Studio
npm run db:seed      # Seed database dengan data awal
```

## 📁 Project Structure

```
src/
├── config/         # Konfigurasi database, socket, midtrans
├── controller/     # Business logic
├── middleware/     # Express middleware
├── routes/         # API routes
├── utils/          # Utility functions
└── index.js        # Main application file

prisma/
├── schema.prisma   # Database schema
└── seed.js         # Database seeding

uploads/           # File uploads storage
├── images/
├── audio/
├── documents/
└── others/
```

## 🔒 Security Features

- **Rate Limiting**: Membatasi request per IP
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcryptjs dengan salt rounds 12
- **File Validation**: Type dan size validation untuk uploads

## 🚀 Deployment

### VPS Deployment

1. **Setup Server**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib
```

2. **Setup Database**

```bash
# Create database user
sudo -u postgres createuser --interactive --pwprompt

# Create database
sudo -u postgres createdb dokter_app_db
```

3. **Deploy Application**

```bash
# Clone repository
git clone <your-repo-url>
cd dokter-consultation-api

# Install dependencies
npm install --production

# Setup environment
cp .env.example .env
# Edit .env dengan konfigurasi production

# Setup database
npm run db:push
npm run db:seed

# Install PM2 untuk process management
npm install -g pm2

# Start application
pm2 start src/index.js --name "dokter-api"
pm2 startup
pm2 save
```

4. **Setup Nginx (Optional)**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🧪 Testing

### Health Check

```bash
curl http://localhost:4000/api/health
```

### Default Accounts (setelah seeding)

- **Admin**: admin@dokterapp.com / password123
- **Doctor 1**: dr.ahmad@dokterapp.com / password123
- **Doctor 2**: dr.sari@dokterapp.com / password123
- **Patient 1**: pasien1@email.com / password123
- **Patient 2**: pasien2@email.com / password123

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

Jika ada pertanyaan atau butuh bantuan:

- Create issue di GitHub repository
- Email: support@dokterapp.com
- Documentation: [API Docs](http://localhost:4000)

---

**Happy Coding! 🚀**
