# CycloX

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.0-black)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.0-2D3748)](https://www.prisma.io/)
[![Auth.js](https://img.shields.io/badge/Auth.js-5.0-green)](https://authjs.dev/)

A modern cycling analytics platform that helps athletes track, analyze, and improve their performance with a streamlined Next.js App Router architecture.

## 🚴‍♂️ About CycloX

CycloX is a personal project I developed to enhance my fullstack skills while solving a real problem for cyclists. The platform enables cyclists to track their training metrics, analyze performance patterns, and optimize training through custom calculations like Training Stress Score (TSS), Fitness (CTL), Fatigue (ATL), and Form (TSB).

### Inspiration & Purpose

This project is inspired by [intervals.icu](https://intervals.icu), an excellent training analytics platform that I personally use and support. CycloX is **not intended as a competitor** but rather as a learning project that allows me to deepen my understanding of fullstack development while working with data I'm passionate about. I'm a daily user and supporter of intervals.icu and appreciate the values they represent in the cycling analytics space.

Unlike platform-specific metrics, CycloX calculates these values independently, allowing integration with multiple data sources starting with Strava, with plans to support Garmin, Intervals.icu, and manual data entry.

## ✨ Key Features

- 🔄 **Strava Integration**: Seamlessly sync your cycling activities
- 📈 **Training Metrics**: Calculate and visualize TSS, CTL, ATL, and TSB
- 📱 **Responsive Design**: Optimized for desktop and mobile
- 🔒 **Secure Authentication**: Auth.js with multiple providers
- 🧠 **Personalized Insights**: Training recommendations based on your data
- 🚀 **Modern Architecture**: Server Components for efficient data loading

## 🛠️ Tech Stack

- **Framework**: Next.js (App Router) with TypeScript
- **Authentication**: Auth.js with Google and Strava OAuth providers
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS
- **Deployment**: Vercel with Edge Functions
- **Background Jobs**: Vercel Cron + Supabase Edge Functions

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- PostgreSQL database

### Installation

1. Clone the repository

   ```bash
   git clone https://github.com/yourusername/cyclox.git
   cd cyclox
   ```

2. Install dependencies

   ```bash
   pnpm install
   ```

3. Set up environment variables

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. Set up the database

   ```bash
   pnpm dlx prisma migrate dev
   ```

5. Run the development server
   ```bash
   pnpm dev
   ```

## 🧪 Learning Focus

This project was built to strengthen my fullstack development skills within the modern Next.js ecosystem. Key learning areas included:

- Next.js App Router architecture
- React Server Components
- Auth.js implementation with custom providers
- Webhook handling and background jobs
- API route design and optimization
- Type-safe frontend-backend integration

## 👤 About Me

I built CycloX as a side project to explore modern fullstack development patterns while combining my passion for cycling and technology. Connect with me on [LinkedIn](https://www.linkedin.com/in/daniel-domsodi/) to discuss the project or potential collaborations.

---

<div align="center">
  <sub>Fueled by caffeine and cadence 🚴‍♂️ | Daniel Domsodi</sub>
</div>
