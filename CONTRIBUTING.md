# Contributing to NodeNav

First off, thank you for considering contributing to NodeNav! It's people like you that make NodeNav such a great tool for the automotive community.

## 🎯 Ways to Contribute

### 🐛 Reporting Bugs

Bug reports help make NodeNav better for everyone. When filing a bug report, please include:

1. **Clear title**: Describe the issue briefly
2. **Steps to reproduce**: List exact steps to reproduce the issue
3. **Expected behavior**: What should happen
4. **Actual behavior**: What actually happens
5. **Environment**: 
   - OS and version (Windows 10/11, Linux distro, etc.)
   - Node.js version (`node --version`)
   - Hardware (Raspberry Pi model, Bluetooth adapter, etc.)
6. **Screenshots**: If applicable
7. **Logs**: Console output or error messages

### 💡 Suggesting Features

Feature suggestions are welcome! Please include:

1. **Use case**: Describe the problem you're trying to solve
2. **Proposed solution**: How you envision the feature working
3. **Alternatives**: Any alternative solutions you've considered
4. **Additional context**: Screenshots, mockups, or examples

### 📝 Improving Documentation

Documentation improvements are always appreciated:

- Fix typos or clarify existing docs
- Add examples or use cases
- Translate documentation (future feature)
- Create tutorials or guides

### 💻 Contributing Code

#### Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/NodeNav.git
   cd NodeNav
   ```
3. **Create a branch** for your feature:
   ```bash
   git checkout -b feature/amazing-feature
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```
5. **Make your changes**

#### Development Setup

```bash
# Terminal 1: Start backend server
cd src
node server.js

# Terminal 2: Start frontend dev server
npm run dev
```

#### Coding Guidelines

**JavaScript/React:**
- Use functional components with hooks
- Follow existing code style (indent with 2 spaces)
- Add comments for complex logic
- Keep components focused and single-purpose
- Use meaningful variable and function names

**Styling:**
- Use the centralized styles from `src/styles.js`
- Maintain the minimalist black theme
- Keep the UI touch-friendly (large hit targets)
- Test on different screen sizes

**Backend:**
- Follow RESTful API conventions
- Add error handling for all async operations
- Log important operations with `console.log`
- Keep platform-specific code isolated

**Platform-Specific Code:**
```javascript
// ✅ Good: Platform detection
if (process.platform === 'win32') {
  // Windows-specific code
} else if (process.platform === 'linux') {
  // Linux-specific code
}

// ❌ Bad: Hard-coded platform assumptions
const command = 'bluetoothctl'; // Won't work on Windows
```

#### Commit Messages

Follow conventional commit format:

```
type(scope): subject

body (optional)

footer (optional)
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(media): add album artwork support

Implements album artwork display in the media player
using AVRCP metadata extensions.

Closes #123
```

```
fix(bluetooth): handle disconnection gracefully

Previously the app would crash if the device disconnected
during playback. Now it cleanly stops monitoring and shows
a reconnection prompt.

Fixes #456
```

#### Testing Your Changes

**Manual Testing:**
1. Test on your target platform (Windows/Linux)
2. Test with real Bluetooth devices if possible
3. Check console for errors or warnings
4. Verify UI responsiveness
5. Test edge cases (disconnection, no audio, etc.)

**Cross-Platform Testing:**
- If you only have one platform, mention this in your PR
- Other contributors can help test on different platforms

#### Pull Request Process

1. **Update documentation** if needed
2. **Update CHANGELOG.md** with your changes
3. **Push to your fork**:
   ```bash
   git push origin feature/amazing-feature
   ```
4. **Open a Pull Request** on GitHub
5. **Fill out the PR template** (if available)
6. **Respond to feedback** from reviewers

**PR Title Format:**
```
feat: Add album artwork support
fix: Handle Bluetooth disconnection gracefully
docs: Update Windows setup instructions
```

**PR Description Should Include:**
- What problem does this solve?
- How did you solve it?
- What testing did you do?
- Screenshots (if UI changes)
- Breaking changes (if any)

## 🏗️ Architecture Overview

```
Frontend (React)
  ├── Components: Reusable UI elements
  ├── Pages: Main application views
  └── Services: API client

Backend (Node.js/Express)
  ├── API Endpoints: RESTful routes
  ├── Services: Business logic
  └── Platform-Specific: OS integrations
```

### Key Areas

**Media Player** (`src/pages/MediaPlayer.jsx`)
- Bluetooth audio streaming
- Playback controls
- Metadata display

**Bluetooth Management** (`src/pages/BluetoothSettings.jsx`)
- Device discovery
- Pairing/connection
- Device list management

**GPIO Control** (`src/pages/GPIOControl.jsx`)
- Pin configuration
- Real-time control
- Command history

**Backend Services** (`src/services/`)
- Bluetooth audio (platform-specific)
- Bluetooth device management
- GPIO operations
- API server

## 📋 Feature Development Guidelines

### Adding a New Page

1. Create component in `src/pages/YourPage.jsx`
2. Add route in `src/App.jsx`
3. Add navigation item if needed
4. Follow existing page structure
5. Use centralized styles

### Adding Bluetooth Features

1. Add method to appropriate service:
   - Device management: `bluetooth-service.js`
   - Audio streaming: `bluetooth-audio-service.js` (Linux) or `bluetooth-audio-windows.js` (Windows)
2. Add API endpoint in `server.js`
3. Add API client method in `api.js`
4. Update UI components to use new feature

### Adding GPIO Features

1. Add method to `gpio-service.js`
2. Add API endpoint in `server.js`
3. Add API client method in `api.js`
4. Update UI in `GPIOControl.jsx`

## 🧪 Testing

Currently, NodeNav relies on manual testing. When contributing:

1. Test your changes thoroughly
2. Test on multiple platforms if possible
3. Test with real hardware (Bluetooth devices, GPIO pins)
4. Document your testing in the PR

**Future:** We plan to add automated testing with Jest/Vitest.

## 📚 Documentation Standards

When documenting:

1. **Be clear and concise**
2. **Include examples**
3. **Specify requirements** (OS, hardware, dependencies)
4. **Add troubleshooting** for common issues
5. **Keep it updated** as code changes

## 🚀 Release Process

(For maintainers)

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create a git tag: `git tag v1.x.x`
4. Push tag: `git push origin v1.x.x`
5. Create GitHub release with notes

## ❓ Questions?

- Open a [GitHub Discussion](https://github.com/yourusername/NodeNav/discussions)
- Check existing issues and pull requests
- Read the documentation in the `docs/` folder

## 📜 Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all.

### Our Standards

**Positive behavior:**
- Being respectful of differing opinions
- Accepting constructive criticism gracefully
- Focusing on what's best for the community
- Showing empathy towards others

**Unacceptable behavior:**
- Harassment, trolling, or insulting comments
- Personal or political attacks
- Publishing others' private information
- Other conduct considered inappropriate

### Enforcement

Report violations to the project maintainers. All complaints will be reviewed and investigated promptly and fairly.

## 🎉 Recognition

Contributors will be:
- Listed in the Contributors section
- Mentioned in release notes for significant contributions
- Given credit in relevant documentation

## 📝 License

By contributing to NodeNav, you agree that your contributions will be licensed under the ISC License.

---

**Thank you for contributing to NodeNav! Your efforts help make automotive technology more accessible to everyone.** 🚗💨
