import confetti from 'canvas-confetti';

const BALLOON_COLORS = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#06b6d4', // cyan
];

export function triggerDoneCelebration() {
  try {
    // 1. Confetti burst from both sides
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.8 },
      colors: BALLOON_COLORS,
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.8 },
      colors: BALLOON_COLORS,
    });
  } catch {
    // Graceful fallback
  }

  // 2. Spawn Floating Balloons on screen
  if (typeof document !== 'undefined') {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.inset = '0';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '9999';
    container.style.overflow = 'hidden';
    document.body.appendChild(container);

    const balloonEmojis = ['🎈', '🎈', '🎈', '🎈', '🎈', '🎈', '🎈'];
    const positions = [10, 22, 38, 50, 64, 78, 90];

    balloonEmojis.forEach((emoji, index) => {
      const balloon = document.createElement('div');
      balloon.className = 'animate-balloon';
      balloon.innerText = emoji;
      balloon.style.position = 'absolute';
      balloon.style.left = `${positions[index % positions.length]}%`;
      balloon.style.bottom = '0';
      balloon.style.fontSize = `${34 + (index % 3) * 10}px`;
      balloon.style.animationDelay = `${index * 0.15}s`;
      balloon.style.animationDuration = `${2.4 + (index % 3) * 0.3}s`;
      container.appendChild(balloon);
    });

    // Clean up container after animations finish
    setTimeout(() => {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }, 3200);
  }
}
