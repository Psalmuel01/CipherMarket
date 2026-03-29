'use client';

import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Cpu,
  Zap,
  Lock,
  ChevronRight,
  ChevronDown,
  Binary,
  Globe,
  Layers
} from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import clsx from 'clsx';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function LandingPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-[#070b14] text-foreground selection:bg-primary selection:text-primary-foreground overflow-x-hidden">

      {/* Landing Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.05] bg-[#070b14]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <Cpu className="h-6 w-6" />
            </div>
            <span className="text-xl font-black tracking-tight tracking-[-1px]">CipherMarket</span>
          </div>
          <div className="hidden gap-8 md:flex">
            {['Technology', 'Security', 'Features'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm font-bold text-muted-foreground transition-colors hover:text-primary"
              >
                {item}
              </a>
            ))}
          </div>
          <Link href="/dashboard">
            <Button className="gap-2">
              Launch App
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-32">
        {/* Animated Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[600px] pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 blur-[120px] rounded-full animate-pulse-glow" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full animate-pulse-glow" style={{ animationDelay: '2s' }} />
        </div>

        <div className="container mx-auto px-6 text-center space-y-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-primary"
          >
            <ShieldCheck className="h-4 w-4" />
            Powered by Ethereum & FHE
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-4xl text-5xl font-[1000] leading-[1.1] tracking-[-3px] sm:text-7xl lg:text-8xl"
          >
            Predict with <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-blue-400">absolute</span> privacy.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-auto max-w-2xl text-lg text-muted-foreground/80 leading-relaxed font-medium"
          >
            The first prediction market where your positions are encrypted end-to-end.
            Powered by FHE on Ethereum Sepolia, ensuring that what you know remains your secret until settlement.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6"
          >
            <Link href="/dashboard">
              <Button size="lg" className="h-14 px-10 text-lg gap-2">
                Get Started
                <ChevronRight className="h-5 w-5" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="h-14 px-10 text-lg border-white/5 bg-white/[0.02] hover:bg-white/[0.05]">
              Read Whitepaper
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="pt-20 flex justify-center"
          >
            <ChevronDown className="h-6 w-6 text-muted-foreground animate-bounce" />
          </motion.div>
        </div>
      </section>

      {/* Grid Features */}
      <section id="features" className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="mb-20 text-center">
            <h2 className="text-4xl font-black tracking-tighter mb-4">Unbreakable Infrastructure</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Traditional markets expose your edge. CipherMarket seals it under layers of homomorphic encryption.</p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {[
              {
                title: 'Confidential Positions',
                desc: 'Your bet amount and outcome remain shielded. Only the total pool and market state are public.',
                icon: Lock,
                color: 'text-primary'
              },
              {
                title: 'Ethereum Security',
                desc: 'Settled on Ethereum Sepolia for robust, decentralized integrity and finality.',
                icon: Globe,
                color: 'text-blue-400'
              },
              {
                title: 'FHE Computation',
                desc: 'Execute encrypted multi-party calculations without ever revealing the underlying data.',
                icon: Binary,
                color: 'text-emerald-400'
              },
              {
                title: 'Optimistic Oracle',
                desc: 'A decentralized resolution desk for fair and transparent market settlement.',
                icon: Zap,
                color: 'text-yellow-400'
              },
              {
                title: 'Multi-Step Lifecycle',
                desc: 'Interactive demo flow: Create, Bet, Stage Proposal, and Claim your rewards.',
                icon: Layers,
                color: 'text-purple-400'
              },
              {
                title: 'Modern SaaS UI',
                desc: 'High-performance trading terminal designed for senior developers and pro-users.',
                icon: Cpu,
                color: 'text-indigo-400'
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className="glass-card group p-8 rounded-[32px] border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-primary/20 transition-all duration-500"
              >
                <div className={clsx("mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 transition-transform group-hover:scale-110", feature.color)}>
                  <feature.icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-black mb-3 text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Technology Section: How it Works */}
      <section id="technology" className="py-24 bg-white/[0.01]">
        <div className="container mx-auto px-6 max-w-5xl text-center space-y-16">
          <div className="space-y-3">
            <h2 className="text-4xl font-black tracking-tight sm:text-5xl">Confidentiality as a Service</h2>
            <p className="text-muted-foreground text-lg">Fully Homomorphic Encryption (FHE) on Sepolia allows data to be processed without decryption.</p>
          </div>

          <div className="grid gap-12 md:grid-cols-3">
            {[
              { step: '01', title: 'Encrypt', desc: 'User bets are encrypted locally before being transmitted to the contract.' },
              { step: '02', title: 'Process', desc: 'The contract aggregates encrypted inputs and computes the final pool state.' },
              { step: '03', title: 'Reveal', desc: 'Once the market resolves, the oracle reveals results and pays out winners.' },
            ].map((step) => (
              <div key={step.step} className="space-y-3 relative">
                <div className="text-6xl font-[1000] text-primary/10 select-none absolute -top-10 left-1/2 -translate-x-1/2">{step.step}</div>
                <h3 className="text-xl font-bold pt-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Simple Encryption Illustration */}
          <div className="glass-card p-10 rounded-[32px] border-primary/20 bg-primary/[0.02] mt-10">
            <pre className="text-left text-[10px] sm:text-xs font-mono text-primary/80 overflow-x-auto">
              {`const cipherValue = await fhenix.encrypt(betAmount, userKey);
// Output is opaque to everyone including the contract owner:
// [0x5f2d...0a11] + [0x3c2a...1b22] = [0x9b4f...5c33]
await contract.placeEncryptedBet(cipherValue);`}
            </pre>
            <p className="mt-6 text-sm font-bold text-foreground">Ethereum transparency meets cryptographic secrecy.</p>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <footer className="py-24 border-t border-white/5 text-center space-y-10">
        <h2 className="text-4xl font-black tracking-tighter">Ready to enter the private terminal?</h2>
        <Link href="/dashboard">
          <Button size="lg" className="h-16 px-16 text-xl rounded-2xl group">
            Start Trading
            <ChevronRight className="h-6 w-6 ml-2 transition-transform group-hover:translate-x-1" />
          </Button>
        </Link>
        <div className="pt-10 flex flex-col items-center gap-4 text-xs font-bold text-muted-foreground uppercase tracking-[0.3em]">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-muted-foreground">
            <Cpu className="h-6 w-6" />
          </div>
          <span>CipherMarket v1.0.0-Beta</span>
        </div>
      </footer>
    </div>
  );
}
