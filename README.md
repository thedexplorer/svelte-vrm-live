# Threlte Live - 3D VRM Avatar Streaming Platform

A SvelteKit application for live-streaming 3D VRM avatars with AI-powered chat, text-to-speech, animations, and blockchain integration.

![Banner!](showcase.png 'Showcase')
[Click to see showcase video](showcase.mp4)

## Features

- Threlte/Three.js for 3D rendering
- VRM avatar loading and animation with @pixiv/three-vrm
- Google Generative AI for conversational responses
- Text-to-speech with lip-sync
- Chat interface
- Mixamo animation integration

See [roadmap.md](roadmap.md) for full details and planned features.

### Text-to-Speech and Phonemes

The project uses ElevenLabs TTS with phoneme timings for VRM lip-sync.

Learn more:

- [What is a Phoneme](https://elevenlabs.io/blog/what-is-a-phoneme)
- [Prompting Controls](https://elevenlabs.io/docs/best-practices/prompting/controls)

Phonemes mapped: A, AA, AH, AE, AO, AW, AY, E, EH, ER, EY, I, IH, IY, O, OH, OW, OY, U, UH, UW, M, B, P, F, V, TH, L, R, NEUTRAL.

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/svelte-vrm-live.git
   cd svelte-vrm-live
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

### Environment Variables

Set the following environment variables (for example, create a `.env` file in the project root):

```bash
# Google Generative AI
GOOGLE_API_KEY=your_google_api_key

# ElevenLabs Text-to-Speech
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

These keys are required for the chat and text-to-speech features.

## Developing

Start the development server:

```bash
pnpm dev
```

Open http://localhost:5173.

## Building

Build for production:

```bash
pnpm build
```

Preview:

```bash
pnpm run preview
```

## Keywords

svelte, sveltekit, threejs, threlte, vrm, 3d-avatar, ai-chat, text-to-speech, lipsync, phonemes, mixamo, animations, blockchain, solana, generative-ai, youtube-streaming

## Contributing

We welcome contributions! Before we can merge your first pull request you must sign our Contributor License Agreement (CLA). When you open a PR, GitHub will display a message from the CLA bot with a link to sign.

- Individual contributors: see [docs/CLA_INDIVIDUAL.md](docs/CLA_INDIVIDUAL.md)
- Companies/corporations: see [docs/CLA_CORPORATE.md](docs/CLA_CORPORATE.md)

Once the CLA is signed, the status check will update automatically, and we’ll be able to review your contribution.

## License

AGPL (see LICENSE file)
