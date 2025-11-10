# Voice Call Application - Mobile-First WebRTC

A beautiful, modern voice calling application built with WebRTC, featuring a sleek mobile-first design with excellent UX.

## 🎨 Features

### UI/UX Enhancements

- **Animated WebGL Background** - Stunning procedurally generated background using OGL shaders
- **Mobile-First Design** - Optimized for touch devices with responsive layout
- **Modern Material Design** - Beautiful gradients, shadows, and smooth animations with glassmorphism
- **Touch-Friendly Controls** - Large, easy-to-tap buttons (minimum 48px touch targets)
- **Real-time Visual Feedback** - Connection status, call states, and notifications
- **Smooth Animations** - Slide-up cards, pulse rings, sound wave animations
- **Dark Theme with Transparency** - Eye-friendly dark theme with semi-transparent glass effects
- **Safe Area Support** - Respects iPhone notch and other device safe areas
- **Interactive Background** - Mouse/touch-responsive background animation

### Functional Features

- **Real-time Voice Calling** - High-quality peer-to-peer voice calls
- **WebSocket Signaling** - Reliable connection with auto-reconnect
- **Call Management** - Accept/reject incoming calls, end active calls
- **Mute Control** - Toggle microphone on/off during calls
- **Speaker Control** - Switch between earpiece and speaker
- **Call Duration Timer** - Live timer showing call duration
- **Toast Notifications** - Non-intrusive status messages
- **Error Handling** - Graceful error recovery and user feedback

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Modern web browser with WebRTC support

### Installation

1. **Install dependencies for both client and server:**

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Running the Application

1. **Start the signaling server:**

```bash
cd server
node index.js
```

The server will start on `ws://localhost:8080`

2. **Start the client development server:**

```bash
cd client
npm run dev
```

The client will be available at `http://localhost:5173`

3. **Open the application:**
   - Open `http://localhost:5173` in your browser
   - For testing, open it in two different browser windows/tabs

### Testing on Mobile

#### Option 1: Network Access (Same WiFi)

1. Start the servers as described above
2. Find your computer's local IP address:

   ```bash
   # On macOS/Linux
   ifconfig | grep "inet "

   # On Windows
   ipconfig
   ```

3. On your mobile device, navigate to `http://YOUR_IP:5173`
4. Update the WebSocket URL in `client/main.js` to use your IP:
   ```javascript
   const WS_URL = "ws://YOUR_IP:8080";
   ```

#### Option 2: Browser DevTools (Mobile Simulation)

1. Open the app in Chrome/Firefox
2. Press F12 to open DevTools
3. Click the device toggle button (Ctrl+Shift+M)
4. Select a mobile device preset

## 📱 How to Use

### First Time Setup

1. **Enter Your ID** - Choose a unique identifier (e.g., "john_doe")
2. **Grant Microphone Permission** - Allow access when prompted
3. **Click Register** - Your ID will be registered on the server

### Making a Call

1. Enter the peer's ID in the "Call Someone" field
2. Click the **Start Call** button
3. Wait for the connection to establish
4. Once connected, you'll see the active call screen

### Receiving a Call

1. When someone calls you, you'll see an incoming call screen
2. Click the **green phone button** to accept
3. Click the **red X button** to reject

### During a Call

- **Mute/Unmute** - Click the microphone button
- **Speaker On/Off** - Click the speaker button
- **End Call** - Click the red phone button

## 🎯 UI Components

### Connection Status Indicator

- **Yellow pulse** - Connecting to server
- **Green solid** - Connected to server
- **Gray** - Disconnected

### Call States

1. **Idle State** - Ready to make calls
2. **Incoming State** - Receiving a call with pulsing animation
3. **Active State** - In an active call with sound wave animation

### Toast Notifications

- **Success** (Green) - Actions completed successfully
- **Error** (Red) - Something went wrong
- **Info** (Blue) - General information

## 🎨 Design System

### Background Animation

The application features a mesmerizing WebGL-powered background animation powered by **OGL** (a minimal WebGL library). The animation includes:

- **Procedural shader effects** - Real-time generative art
- **Smooth color transitions** - Indigo to purple gradient flow
- **Interactive mouse/touch tracking** - Animation responds to user input
- **Optimized for mobile** - 60fps performance on modern devices
- **Glassmorphism UI** - Semi-transparent cards with backdrop blur

To customize the background animation, edit the parameters in `client/main.js`:

```javascript
bgAnimation = new BalatroBG(bgCanvas, {
  spinRotation: -2.0, // Rotation speed
  spinSpeed: 5.0, // Animation speed
  color1: "#667eea", // Primary color
  color2: "#764ba2", // Secondary color
  color3: "#0f172a", // Background color
  contrast: 3.0, // Contrast level
  lighting: 0.35, // Lighting intensity
  pixelFilter: 650.0, // Pixelation level
  isRotate: true, // Enable rotation
  mouseInteraction: true, // Enable mouse tracking
});
```

### Colors

- **Primary** - Indigo gradient (#667eea → #764ba2)
- **Success** - Emerald (#10b981)
- **Danger** - Red (#ef4444)
- **Background** - Dark slate (#0f172a) with animated WebGL overlay
- **Glass Effects** - Semi-transparent elements with backdrop-filter blur

### Typography

- **Font Family** - Inter (Google Fonts)
- **Base Size** - 16px (14px on small screens)
- **Font Weights** - 400, 500, 600, 700

### Spacing Scale

- XS: 0.5rem (8px)
- SM: 0.75rem (12px)
- MD: 1rem (16px)
- LG: 1.5rem (24px)
- XL: 2rem (32px)

## 🔧 Technical Architecture

### Client Stack

- **Vanilla JavaScript** - No framework dependencies
- **Vite** - Fast development server and build tool
- **WebRTC** - Peer-to-peer audio streaming
- **WebSocket** - Real-time signaling
- **OGL (Open Graphics Library)** - Lightweight WebGL library for background animation
- **GLSL Shaders** - Custom fragment and vertex shaders for procedural effects

### Server Stack

- **Node.js** - JavaScript runtime
- **Express** - Web server framework
- **ws** - WebSocket library

### WebRTC Flow

1. **Registration** - Users register their ID with the signaling server
2. **Offer** - Caller creates and sends an offer
3. **Answer** - Callee accepts and sends an answer
4. **ICE Candidates** - Both peers exchange ICE candidates for NAT traversal
5. **Connection** - Direct peer-to-peer audio stream established

## 📱 Mobile Optimizations

### Performance

- CSS transforms for smooth animations
- Hardware acceleration with `will-change`
- Minimal repaints and reflows

### Accessibility

- Semantic HTML structure
- ARIA labels where needed
- Keyboard navigation support
- Touch-friendly 48px minimum tap targets

### Compatibility

- iOS Safari support with `-webkit-` prefixes
- Android Chrome optimization
- `playsinline` attribute for iOS audio
- Safe area insets for notched devices

## 🐛 Troubleshooting

### Microphone Access Denied

- Check browser permissions (usually shown in the address bar)
- HTTPS is required for microphone access (or localhost)

### Connection Issues

- Ensure the signaling server is running
- Check that both users are connected to the server
- Verify firewall settings aren't blocking WebSocket connections

### No Audio

- Check device volume
- Ensure microphone isn't muted
- Try refreshing the page
- Check browser console for errors

### Mobile Issues

- Use HTTPS for production (WebRTC requires secure context)
- Ensure camera/microphone permissions are granted
- Try a different browser if issues persist

## 🚀 Production Deployment

### Client Build

```bash
cd client
npm run build
```

The built files will be in `client/dist/`

### Environment Variables

For production, update these values:

- WebSocket URL in `client/main.js`
- Server port in `server/index.js`
- Add TURN servers for better NAT traversal

### HTTPS Setup

WebRTC requires HTTPS in production. Use:

- Let's Encrypt for free SSL certificates
- Cloudflare for CDN and SSL
- Your hosting provider's SSL solution

## 📄 License

MIT License - Feel free to use this project however you'd like!

## 🙏 Acknowledgments

- Google STUN servers for ICE candidate gathering
- Inter font family by Rasmus Andersson
- Feather Icons inspiration for SVG icons

---

**Built with ❤️ for mobile-first communication**
