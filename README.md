<div align="center">

<img src="https://raw.githubusercontent.com/devyashrasela/dormpay/main/frontend/src/assets/logo.svg" alt="DormPay Logo" width="120" height="120" />

# DormPay

### Next-Gen Campus Payment Infrastructure

**Instant student payments, dorm settlements, and campus infrastructure built on Algorand.**

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Algorand](https://img.shields.io/badge/Blockchain-Algorand-00D4AA?logo=algorand)](https://algorand.com)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)

[Features](#key-features) • [Quick Start](#quick-start) • [Tech Stack](#tech-stack) • [Team](#team)

</div>

---

## What is DormPay?

DormPay revolutionizes campus payments with blockchain technology. Split bills with roommates, track expenses in real-time, and transfer funds instantly—all secured by Algorand's Pure Proof-of-Stake consensus.

### Key Features

- **Instant Transfers** - Zero-latency peer-to-peer payments
- **Expense Tracking** - Real-time wallet analytics and spending insights
- **Voice Alerts** - AI-powered transaction notifications via ElevenLabs
- **Bill Splitting** - Automated dorm and group expense distribution
- **DormDrop** - Geolocation-based peer discovery for nearby transfers
- **Secure Auth** - Auth0 integration with Pera Wallet support
- **AI Assistant** - Gemini-powered chat for transaction help

---

## Quick Start

### Prerequisites

Make sure you have these installed:

```bash
node -v    # v18 or higher
npm -v     # v9 or higher
mysql --version  # MySQL 8.0+
```

### 1. Clone the Repository

```bash
git clone https://github.com/devyashrasela/dormpay.git
cd dormpay
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:

```bash
cp .env.example .env
```

Configure your `.env`:

```env
# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# MySQL Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=campus_wallet
DB_USER=root
DB_PASSWORD=your_password

# Auth0
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_AUDIENCE=your-api-audience

# Algorand TestNet (defaults work)
ALGOD_SERVER=https://testnet-api.algonode.cloud
ALGOD_PORT=443
INDEXER_SERVER=https://testnet-idx.algonode.cloud
INDEXER_PORT=443

# Gemini AI
GEMINI_API_KEY=your_gemini_key

# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_key

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

Create database and run migrations:

```bash
mysql -u root -p
```

```sql
CREATE DATABASE campus_wallet;
EXIT;
```

```bash
npm run db:migrate
npm run dev
```

Backend runs on `http://localhost:5000`

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
```

Create `.env` file:

```bash
cp .env.example .env
```

Configure your `.env`:

```env
VITE_AUTH0_DOMAIN=your-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=your-api-audience
VITE_API_URL=http://localhost:5000
VITE_ALGOD_SERVER=https://testnet-api.algonode.cloud
```

Start the dev server:

```bash
npm run dev
```

Frontend runs on `http://localhost:5173`

---

## Required Services

### 1. MySQL Database

**macOS (Homebrew):**
```bash
brew install mysql
brew services start mysql
mysql_secure_installation
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo mysql_secure_installation
```

**Windows:**
Download from [MySQL Downloads](https://dev.mysql.com/downloads/installer/)

### 2. Auth0 Account

1. Sign up at [auth0.com](https://auth0.com)
2. Create a new application (Single Page Application)
3. Create an API
4. Copy Domain, Client ID, and Audience to your `.env` files

### 3. Algorand TestNet

No setup needed! We use public nodes:
- Algod: `https://testnet-api.algonode.cloud`
- Indexer: `https://testnet-idx.algonode.cloud`

Get test ALGO from [TestNet Dispenser](https://bank.testnet.algorand.network/)

### 4. Gemini AI (Optional)

1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add to backend `.env` as `GEMINI_API_KEY`

### 5. ElevenLabs (Optional)

1. Sign up at [elevenlabs.io](https://elevenlabs.io)
2. Get API key from dashboard
3. Add to backend `.env` as `ELEVENLABS_API_KEY`

---

## Tech Stack

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Zustand** - State management
- **React Router** - Navigation
- **Pera Wallet** - Algorand wallet integration
- **Auth0** - Authentication

### Backend
- **Node.js + Express** - API server
- **Sequelize** - ORM
- **MySQL** - Database
- **AlgoSDK** - Algorand blockchain integration
- **Gemini AI** - Conversational AI
- **ElevenLabs** - Voice synthesis
- **Swagger** - API documentation

### Blockchain
- **Algorand** - Layer-1 blockchain
- **Pure Proof-of-Stake** - Consensus mechanism
- **TestNet** - Development network

---

## API Documentation

Once the backend is running, visit:

```
http://localhost:5000/api/docs
```

Interactive Swagger UI with all endpoints documented.

---

## Project Structure

```
dormpay/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Auth & validation
│   │   ├── models/         # Sequelize models
│   │   ├── routes/         # API routes
│   │   ├── utils/          # Helper functions
│   │   └── server.js       # Entry point
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios config
│   │   ├── assets/         # Images & icons
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom hooks
│   │   ├── pages/          # Page components
│   │   ├── store/          # Zustand stores
│   │   ├── utils/          # Utilities
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
│
└── README.md
```

---

## Screenshots

<div align="center">

### Landing Page
*Modern, high-octane design showcasing DormPay's capabilities*

### Dashboard
*Real-time wallet balance, transaction history, and analytics*

### Bill Splitting
*Effortless group expense management with automated distribution*

### AI Chat Assistant
*Gemini-powered conversational interface for transaction help*

</div>

---

## Team

<div align="center">

| [Mayank Padhi](https://github.com/Diclo-fenac) | [Devyash Rasela](https://github.com/devyashrasela) | [Basil Zafar](https://github.com/BasilZafar11) |
|:---:|:---:|:---:|
| [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?logo=linkedin&logoColor=white)](https://www.linkedin.com/in/mayank-padhi-zia/) | [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?logo=linkedin&logoColor=white)](https://www.linkedin.com/in/devyash-rasela/) | [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?logo=linkedin&logoColor=white)](https://www.linkedin.com/in/basil-zafar-490b08302/) |

</div>

---

## Contributing

We welcome contributions! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- Built at **AceHack 5.0**
- Powered by **Algorand Foundation**
- Voice by **ElevenLabs**
- AI by **Google Gemini**
- Auth by **Auth0**

---

<div align="center">

### Made with love by ZeroLag

**[Back to Top](#dormpay)**

</div>
