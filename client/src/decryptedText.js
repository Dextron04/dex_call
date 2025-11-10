// Decrypted Text Animation (Vanilla JS version)
import { animate } from 'motion';

export class DecryptedText {
    constructor(element, options = {}) {
        this.element = element;
        this.text = options.text || element.textContent;
        this.speed = options.speed || 50;
        this.maxIterations = options.maxIterations || 10;
        this.sequential = options.sequential || false;
        this.revealDirection = options.revealDirection || 'start';
        this.useOriginalCharsOnly = options.useOriginalCharsOnly || false;
        this.characters = options.characters || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+';
        this.className = options.className || '';
        this.encryptedClassName = options.encryptedClassName || 'encrypted-char';
        this.animateOn = options.animateOn || 'hover';

        this.displayText = this.text;
        this.isHovering = false;
        this.isScrambling = false;
        this.revealedIndices = new Set();
        this.hasAnimated = false;
        this.interval = null;
        this.observer = null;

        this.init();
    }

    init() {
        // Clear existing content and set up structure
        this.element.innerHTML = '';
        this.element.style.display = 'inline-block';
        this.element.style.whiteSpace = 'pre-wrap';

        // Create spans for each character
        this.updateDisplay();

        // Setup hover events
        if (this.animateOn === 'hover' || this.animateOn === 'both') {
            this.element.addEventListener('mouseenter', () => this.handleHover(true));
            this.element.addEventListener('mouseleave', () => this.handleHover(false));
        }

        // Setup intersection observer for view animation
        if (this.animateOn === 'view' || this.animateOn === 'both') {
            this.setupIntersectionObserver();
        }
    }

    setupIntersectionObserver() {
        const observerCallback = (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.hasAnimated) {
                    this.handleHover(true);
                    this.hasAnimated = true;
                }
            });
        };

        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        this.observer = new IntersectionObserver(observerCallback, observerOptions);
        this.observer.observe(this.element);
    }

    getNextIndex(revealedSet) {
        const textLength = this.text.length;
        switch (this.revealDirection) {
            case 'start':
                return revealedSet.size;
            case 'end':
                return textLength - 1 - revealedSet.size;
            case 'center': {
                const middle = Math.floor(textLength / 2);
                const offset = Math.floor(revealedSet.size / 2);
                const nextIndex = revealedSet.size % 2 === 0 ? middle + offset : middle - offset - 1;

                if (nextIndex >= 0 && nextIndex < textLength && !revealedSet.has(nextIndex)) {
                    return nextIndex;
                }

                for (let i = 0; i < textLength; i++) {
                    if (!revealedSet.has(i)) return i;
                }
                return 0;
            }
            default:
                return revealedSet.size;
        }
    }

    shuffleText(originalText, currentRevealed) {
        const availableChars = this.useOriginalCharsOnly
            ? Array.from(new Set(originalText.split(''))).filter(char => char !== ' ')
            : this.characters.split('');

        if (this.useOriginalCharsOnly) {
            const positions = originalText.split('').map((char, i) => ({
                char,
                isSpace: char === ' ',
                index: i,
                isRevealed: currentRevealed.has(i)
            }));

            const nonSpaceChars = positions.filter(p => !p.isSpace && !p.isRevealed).map(p => p.char);

            for (let i = nonSpaceChars.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [nonSpaceChars[i], nonSpaceChars[j]] = [nonSpaceChars[j], nonSpaceChars[i]];
            }

            let charIndex = 0;
            return positions
                .map(p => {
                    if (p.isSpace) return ' ';
                    if (p.isRevealed) return originalText[p.index];
                    return nonSpaceChars[charIndex++];
                })
                .join('');
        } else {
            return originalText
                .split('')
                .map((char, i) => {
                    if (char === ' ') return ' ';
                    if (currentRevealed.has(i)) return originalText[i];
                    return availableChars[Math.floor(Math.random() * availableChars.length)];
                })
                .join('');
        }
    }

    updateDisplay() {
        this.element.innerHTML = '';

        this.displayText.split('').forEach((char, index) => {
            const span = document.createElement('span');
            span.textContent = char;

            const isRevealedOrDone = this.revealedIndices.has(index) || !this.isScrambling || !this.isHovering;

            if (this.className && isRevealedOrDone) {
                span.className = this.className;
            } else if (this.encryptedClassName && !isRevealedOrDone) {
                span.className = this.encryptedClassName;
            }

            this.element.appendChild(span);
        });
    }

    handleHover(isHovering) {
        this.isHovering = isHovering;

        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }

        if (isHovering) {
            this.isScrambling = true;
            let currentIteration = 0;

            this.interval = setInterval(() => {
                if (this.sequential) {
                    if (this.revealedIndices.size < this.text.length) {
                        const nextIndex = this.getNextIndex(this.revealedIndices);
                        this.revealedIndices.add(nextIndex);
                        this.displayText = this.shuffleText(this.text, this.revealedIndices);
                        this.updateDisplay();
                    } else {
                        clearInterval(this.interval);
                        this.interval = null;
                        this.isScrambling = false;
                    }
                } else {
                    this.displayText = this.shuffleText(this.text, this.revealedIndices);
                    this.updateDisplay();
                    currentIteration++;
                    if (currentIteration >= this.maxIterations) {
                        clearInterval(this.interval);
                        this.interval = null;
                        this.isScrambling = false;
                        this.displayText = this.text;
                        this.updateDisplay();
                    }
                }
            }, this.speed);
        } else {
            this.displayText = this.text;
            this.revealedIndices.clear();
            this.isScrambling = false;
            this.updateDisplay();
        }
    }

    destroy() {
        if (this.interval) {
            clearInterval(this.interval);
        }
        if (this.observer) {
            this.observer.disconnect();
        }
    }
}
