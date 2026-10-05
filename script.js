'use strict';

(() => {
  const scenes = Array.from(document.querySelectorAll('.scene'));
  const photos = Array.from(document.querySelectorAll('.memory-photo'));
  const story = document.querySelector('#story');
  const thread = document.querySelector('.story-thread');
  const threadBase = document.querySelector('.thread-base');
  const threadProgress = document.querySelector('.thread-progress');
  const traveler = document.querySelector('.thread-traveler');
  const journeyProgress = document.querySelector('#journey-progress');
  const chapterLabel = document.querySelector('#chapter-label');
  const chapterLinks = Array.from(document.querySelectorAll('.chapter-nav a'));
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const loadingScreen = document.querySelector('.loading-screen');
  const loaderBackground = document.querySelectorAll('.skip-link, .masthead, .chapter-nav, main, .journey-status, .playback-controls, .heart-bursts, .photo-dialog');
  const music = document.querySelector('#background-music');
  const volumeScreen = document.querySelector('.volume-screen');
  const volumeInput = document.querySelector('#music-volume');
  const volumeValue = document.querySelector('#music-volume-value');
  const musicStatus = document.querySelector('#music-status');
  const musicStart = document.querySelector('.music-start');
  const musicToggle = document.querySelector('.music-toggle');
  const autoScrollToggle = document.querySelector('.auto-scroll-toggle');
  const autoScrollCountdown = document.querySelector('#auto-scroll-countdown');
  const scrollSections = [...scenes, document.querySelector('.dedication')];
  let autoScrollEnabled = true;
  let autoScrollTimer = 0;
  let autoScrollCountdownTimer = 0;
  let scrollStopTimer = 0;
  let introTimer = 0;
  let introExitTimer = 0;
  let introComplete = false;
  let musicFailed = false;
  let continueWithoutMusic = false;
  loaderBackground.forEach((element) => { element.inert = true; });
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  music.volume = 1;
  music.muted = false;

  function startIntro() {
    if (introComplete || introTimer) return;
    introTimer = window.setTimeout(() => {
      loadingScreen.classList.add('is-leaving');
      document.documentElement.classList.add('intro-revealing');
      observeReveals();
      introExitTimer = window.setTimeout(() => {
        const moveFocus = document.activeElement === loadingScreen;
        loadingScreen.remove();
        document.documentElement.classList.remove('loading-intro', 'intro-revealing');
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        introComplete = true;
        loaderBackground.forEach((element) => { element.inert = false; });
        if (moveFocus) document.querySelector('.text-link').focus({ preventScroll: true });
        requestMeasure();
        scheduleAutoScroll();
        autoSendLove();
      }, motionPreference.matches ? 0 : 1000);
    }, 5000);
  }

  function updateMusicGate() {
    const audibleVolume = music.muted ? 0 : music.volume;
    const volumePercent = Math.round(audibleVolume * 100);
    const gateRequired = !continueWithoutMusic && (musicFailed || audibleVolume < 0.4 || (!introComplete && (music.paused || music.readyState < HTMLMediaElement.HAVE_FUTURE_DATA)));
    const gateWasVisible = document.documentElement.classList.contains('music-gated');
    volumeInput.value = String(volumePercent);
    volumeValue.value = `${volumePercent}%`;
    volumeInput.setAttribute('aria-valuetext', `${volumePercent}% music volume`);
    document.documentElement.classList.toggle('music-gated', gateRequired);
    scheduleAutoScroll();
    volumeScreen.inert = !gateRequired;
    volumeScreen.setAttribute('aria-hidden', String(!gateRequired));
    loaderBackground.forEach((element) => { element.inert = gateRequired || !introComplete; });
    musicToggle.setAttribute('aria-pressed', String(!music.paused));
    musicToggle.setAttribute('aria-label', music.paused ? 'Play background music' : 'Pause background music');
    musicToggle.querySelector('.music-toggle-label').textContent = music.paused ? 'Music off' : 'Music on';
    if (gateRequired) {
      if (!introComplete) {
        clearTimeout(introTimer);
        clearTimeout(introExitTimer);
        introTimer = 0;
        loadingScreen.classList.remove('is-leaving');
        document.documentElement.classList.remove('intro-revealing');
      }
      if (!musicFailed && !music.paused && audibleVolume < 0.4) musicStatus.textContent = 'Raise music volume to at least 40% to continue.';
      if (!gateWasVisible) volumeInput.focus({ preventScroll: true });
      return;
    }
    if (volumeScreen.contains(document.activeElement)) {
      if (introComplete) musicToggle.focus({ preventScroll: true });
      else loadingScreen.focus({ preventScroll: true });
    }
    startIntro();
    autoSendLove();
  }

  function showMusicError() {
    musicFailed = true;
    musicStart.disabled = false;
    musicStart.textContent = 'Open without music';
    musicStatus.textContent = 'The music couldn’t play in this browser. You can still open your love letter.';
    updateMusicGate();
  }

  async function playMusic() {
    musicStart.disabled = true;
    musicStatus.textContent = 'Starting background music…';
    try {
      await music.play();
      musicStatus.textContent = music.volume < 0.4 ? 'Raise music volume to at least 40% to continue.' : 'Music is ready. Opening your love letter…';
      updateMusicGate();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        musicStatus.textContent = 'Tap Play music to begin.';
        updateMusicGate();
      } else if (error instanceof DOMException && error.name === 'AbortError') {
        musicStatus.textContent = 'Playback paused. Tap Play music to continue.';
        updateMusicGate();
      } else {
        showMusicError();
      }
    } finally {
      musicStart.disabled = false;
    }
  }

  volumeInput.addEventListener('input', () => {
    const requestedVolume = Number(volumeInput.value) / 100;
    music.muted = false;
    music.volume = requestedVolume;
    document.querySelector('#music-device-hint').textContent = Math.abs(music.volume - requestedVolume) > 0.01
      ? 'Use your device’s volume buttons on this browser.'
      : 'Turn up your device volume, too.';
    updateMusicGate();
    if (music.paused && !musicFailed) void playMusic();
  });
  musicStart.addEventListener('click', () => {
    if (musicFailed) {
      continueWithoutMusic = true;
      updateMusicGate();
    } else {
      void playMusic();
    }
  });
  musicToggle.addEventListener('click', () => {
    if (music.paused) void playMusic();
    else music.pause();
  });
  music.addEventListener('volumechange', updateMusicGate);
  music.addEventListener('playing', updateMusicGate);
  music.addEventListener('pause', updateMusicGate);
  music.addEventListener('error', showMusicError);
  const svgNamespace = 'http://www.w3.org/2000/svg';
  let pathLength = 0;
  let storyHeight = 0;
  let scrollFrame = 0;
  let resizeFrame = 0;
  let sectionPositions = [];
  let photoPositions = [];

  // Fixed positions keep the decorative art stable between visits and resizes.
  const ornamentPositions = [
    [6, 14, 42, -18], [91, 13, 48, 13], [48, 9, 22, -8],
    [3, 52, 33, -12], [94, 55, 32, 21], [47, 78, 24, 15],
    [12, 88, 39, -11], [83, 89, 41, 8], [76, 6, 18, 22],
    [27, 93, 20, -15], [71, 94, 25, 9], [54, 43, 17, -20],
    [16, 9, 18, 15], [89, 76, 19, -9], [6, 73, 22, 11]
  ];
  const themeSymbols = {
    teacher: ['book', 'heart', 'spark', 'flower', 'heart'],
    rainbow: ['sun', 'heart', 'flower', 'spark', 'flower'],
    rose: ['heart', 'flower', 'heart', 'spark', 'heart'],
    desert: ['sun', 'heart', 'spark', 'heart', 'spark']
  };

  scenes.forEach((scene, sceneIndex) => {
    const container = scene.querySelector('.decorations');
    const symbols = themeSymbols[scene.dataset.theme];
    ornamentPositions.forEach(([x, y, size, angle], index) => {
      const symbol = symbols[index % symbols.length];
      const ornament = document.createElement('span');
      ornament.className = `decoration ${symbol}${symbol === 'heart' && index % 3 === 0 ? ' filled' : ''}`;
      ornament.style.cssText = `--x:${x}%;--y:${y}%;--size:${size}px;--angle:${angle}deg;--duration:${8 + index % 5}s;--delay:-${index + sceneIndex}s;--opacity:${index % 2 ? 0.34 : 0.48}`;
      const svg = document.createElementNS(svgNamespace, 'svg');
      const use = document.createElementNS(svgNamespace, 'use');
      use.setAttribute('href', `#${symbol}`);
      svg.append(use);
      ornament.append(svg);
      container.append(ornament);
    });
  });

  function measureStory() {
    const storyBounds = story.getBoundingClientRect();
    storyHeight = story.scrollHeight;
    thread.setAttribute('viewBox', `0 0 ${storyBounds.width} ${storyHeight}`);
    photoPositions = photos.map((photo) => {
      const bounds = photo.getBoundingClientRect();
      return { x: bounds.left - storyBounds.left + bounds.width / 2, y: bounds.top - storyBounds.top + bounds.height / 2, height: bounds.height };
    });
    sectionPositions = scenes.map((scene) => ({
      top: scene.getBoundingClientRect().top + window.scrollY,
      chapter: scene.dataset.chapter
    }));
    const first = photoPositions[0];
    let path = `M ${first.x} ${first.y}`;
    for (let index = 1; index < photoPositions.length; index += 1) {
      const previous = photoPositions[index - 1];
      const current = photoPositions[index];
      if (window.innerWidth <= 700) {
        const gutterX = 18;
        const departureY = previous.y + previous.height / 2 + 50;
        const arrivalY = current.y - current.height / 2 - 50;
        path += ` C ${previous.x} ${previous.y + 70}, ${gutterX} ${previous.y + 70}, ${gutterX} ${departureY}`;
        path += ` L ${gutterX} ${arrivalY} C ${gutterX} ${current.y - 70}, ${current.x} ${current.y - 70}, ${current.x} ${current.y}`;
        continue;
      }
      const gap = (current.y - previous.y) * 0.52;
      path += ` C ${previous.x} ${previous.y + gap}, ${current.x} ${current.y - gap}, ${current.x} ${current.y}`;
    }
    threadBase.setAttribute('d', path);
    threadProgress.setAttribute('d', path);
    pathLength = threadProgress.getTotalLength();
    threadProgress.style.strokeDasharray = `${pathLength} ${pathLength}`;
    updateJourney();
  }

  function updateJourney() {
    scrollFrame = 0;
    const focusY = window.scrollY + window.innerHeight * 0.55;
    const maximumScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    journeyProgress.style.transform = `scaleX(${Math.min(1, Math.max(0, window.scrollY / maximumScroll))})`;
    const current = sectionPositions.findLast((section) => focusY >= section.top) || sectionPositions[0];
    if (current) {
      if (chapterLabel.textContent !== current.chapter) {
        chapterLabel.textContent = current.chapter;
        if (!motionPreference.matches && typeof chapterLabel.animate === 'function') {
          chapterLabel.getAnimations().forEach((animation) => animation.cancel());
          chapterLabel.animate([{ opacity: 0, translate: '0 4px' }, { opacity: 1, translate: '0 0' }], { duration: 280, easing: 'cubic-bezier(.16,1,.3,1)' });
        }
      }
      const chapterNumber = Number.parseInt(current.chapter, 10) - 1;
      chapterLinks.forEach((link, index) => {
        link.classList.toggle('active', index === chapterNumber);
        if (index === chapterNumber) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
    if (!pathLength || !photoPositions.length) return;
    // Locate the thread by its vertical position, so it follows the actual photos.
    const targetY = Math.min(photoPositions.at(-1).y, Math.max(photoPositions[0].y, focusY));
    let low = 0;
    let high = pathLength;
    for (let iteration = 0; iteration < 13; iteration += 1) {
      const middle = (low + high) / 2;
      if (threadProgress.getPointAtLength(middle).y < targetY) low = middle;
      else high = middle;
    }
    const length = (low + high) / 2;
    threadProgress.style.strokeDashoffset = String(pathLength - length);
    const point = threadProgress.getPointAtLength(length);
    traveler.style.transform = `translate(${point.x}px, ${point.y}px)`;
    traveler.style.visibility = focusY < photoPositions[0].y || focusY > photoPositions.at(-1).y + 220 ? 'hidden' : 'visible';
  }

  function requestMeasure() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(measureStory);
  }

  let revealObserver = null;
  let sceneObserver = null;

  function observeReveals() {
    if (motionPreference.matches || !revealObserver) return;
    document.querySelectorAll('.reveal, .text-reveal').forEach((element) => {
      if (!element.classList.contains('visible')) revealObserver.observe(element);
    });
    scenes.forEach((scene) => sceneObserver.observe(scene));
  }

  if (!motionPreference.matches && 'IntersectionObserver' in window) {
    document.querySelectorAll('.memory figcaption, .memory .photo-note').forEach((element) => element.classList.add('memory-text'));
    document.querySelectorAll('.handwritten').forEach((element) => {
      if (element.children.length) return;
      const fragment = document.createDocumentFragment();
      let wordIndex = 0;
      for (const part of element.textContent.match(/\S+|\s+/g) || []) {
        if (/^\s+$/.test(part)) {
          fragment.append(document.createTextNode(part));
        } else {
          const word = document.createElement('span');
          word.className = 'text-word';
          word.textContent = part;
          word.style.setProperty('--word-delay', `${Math.min(wordIndex * 0.045, 0.22)}s`);
          fragment.append(word);
          wordIndex += 1;
        }
      }
      element.replaceChildren(fragment);
    });
    document.querySelectorAll('.hero-copy, .story-copy, .dedication').forEach((copy) => {
      copy.classList.remove('reveal');
      const elements = copy.querySelectorAll(':scope > h1, :scope > h2, :scope > p:not(.love-response), :scope > a, :scope > button, :scope > svg');
      elements.forEach((element, index) => {
        element.classList.add('text-reveal');
        element.style.setProperty('--text-delay', `${Math.min(index * 0.07, 0.28)}s`);
        if (!element.matches('h1, h2')) return;
        let line = document.createElement('span');
        let lineIndex = 0;
        line.className = 'text-line';
        Array.from(element.childNodes).forEach((node) => {
          if (node.nodeName.toLowerCase() === 'svg') return;
          if (node.nodeName === 'BR') {
            line.style.setProperty('--line-delay', `${Math.min(lineIndex * 0.07, 0.14)}s`);
            element.insertBefore(line, node);
            line = document.createElement('span');
            line.className = 'text-line';
            lineIndex += 1;
          } else {
            line.append(node);
          }
        });
        if (line.hasChildNodes()) {
          line.style.setProperty('--line-delay', `${Math.min(lineIndex * 0.07, 0.14)}s`);
          element.insertBefore(line, element.querySelector(':scope > svg'));
        }
      });
    });
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    sceneObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle('in-view', entry.isIntersecting));
    });
    document.documentElement.classList.add('js-motion');
    story.addEventListener('focusin', (event) => {
      const reveal = event.target.closest('.reveal, .text-reveal');
      if (!reveal) return;
      reveal.classList.add('visible');
      revealObserver.unobserve(reveal);
    });
  }
  function clearAutoScroll() {
    clearTimeout(autoScrollTimer);
    clearInterval(autoScrollCountdownTimer);
    autoScrollTimer = 0;
    autoScrollCountdownTimer = 0;
    autoScrollCountdown.hidden = true;
    autoScrollCountdown.textContent = '';
  }

  function scheduleAutoScroll() {
    clearAutoScroll();
    if (!autoScrollEnabled || !introComplete || loadingScreen.isConnected || document.hidden || document.documentElement.classList.contains('music-gated') || document.body.classList.contains('viewer-open')) return;
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) return;
    const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const currentIndex = scrollSections.findLastIndex((section) => section.getBoundingClientRect().top <= padding + 2);
    const nextSection = scrollSections[currentIndex + 1];
    if (!nextSection) return;
    const deadline = performance.now() + 4000;
    const updateCountdown = () => {
      const seconds = Math.max(1, Math.ceil((deadline - performance.now()) / 1000));
      autoScrollCountdown.textContent = `${seconds}s`;
      autoScrollCountdown.setAttribute('aria-label', `Next section in ${seconds} ${seconds === 1 ? 'second' : 'seconds'}`);
    };
    autoScrollCountdown.hidden = false;
    updateCountdown();
    autoScrollCountdownTimer = window.setInterval(updateCountdown, 200);
    autoScrollTimer = window.setTimeout(() => {
      clearAutoScroll();
      if (!introComplete || loadingScreen.isConnected) return;
      nextSection.scrollIntoView({ behavior: motionPreference.matches ? 'instant' : 'smooth', block: 'start' });
    }, 4000);
  }

  autoScrollToggle.addEventListener('click', () => {
    autoScrollEnabled = !autoScrollEnabled;
    autoScrollToggle.setAttribute('aria-pressed', String(autoScrollEnabled));
    autoScrollToggle.setAttribute('aria-label', autoScrollEnabled ? 'Turn off auto scroll' : 'Turn on auto scroll');
    autoScrollToggle.querySelector('.auto-scroll-toggle-label').textContent = autoScrollEnabled ? 'Auto scroll on' : 'Auto scroll off';
    scheduleAutoScroll();
  });
  document.addEventListener('visibilitychange', scheduleAutoScroll);
  window.addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateJourney);
    clearAutoScroll();
    clearTimeout(scrollStopTimer);
    scrollStopTimer = window.setTimeout(scheduleAutoScroll, 180);
  }, { passive: true });
  window.addEventListener('resize', requestMeasure);
  window.addEventListener('load', requestMeasure);
  motionPreference.addEventListener('change', () => {
    if (motionPreference.matches) {
      document.documentElement.classList.remove('js-motion');
      revealObserver?.disconnect();
      sceneObserver?.disconnect();
      chapterLabel.getAnimations().forEach((animation) => animation.cancel());
    }
  });
  if ('ResizeObserver' in window) new ResizeObserver(requestMeasure).observe(story);
  photos.forEach((photo) => photo.querySelector('img').addEventListener('load', requestMeasure));
  document.querySelectorAll('.memory').forEach((memory) => {
    memory.addEventListener('transitionend', (event) => {
      if (event.target === memory) requestMeasure();
    });
  });
  requestMeasure();

  const dialog = document.querySelector('.photo-dialog');
  const viewerImage = document.querySelector('#viewer-image');
  const viewerCaption = document.querySelector('#viewer-caption');
  const viewerCount = document.querySelector('#viewer-count');
  const previousButton = document.querySelector('.viewer-prev');
  const nextButton = document.querySelector('.viewer-next');
  let activePhoto = 0;
  let returnFocus = null;

  function showPhoto(index) {
    activePhoto = Math.max(0, Math.min(photos.length - 1, index));
    const photo = photos[activePhoto];
    viewerImage.src = photo.dataset.photo;
    viewerImage.alt = photo.querySelector('img').alt;
    viewerCaption.textContent = photo.dataset.caption;
    viewerCount.textContent = `${String(activePhoto + 1).padStart(2, '0')} / ${String(photos.length).padStart(2, '0')}`;
    previousButton.disabled = activePhoto === 0;
    nextButton.disabled = activePhoto === photos.length - 1;
  }

  photos.forEach((photo, index) => {
    photo.addEventListener('click', () => {
      returnFocus = photo;
      showPhoto(index);
      document.body.classList.add('viewer-open');
      dialog.showModal();
      scheduleAutoScroll();
    });
  });
  previousButton.addEventListener('click', () => showPhoto(activePhoto - 1));
  nextButton.addEventListener('click', () => showPhoto(activePhoto + 1));
  document.querySelector('.close-viewer').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showPhoto(activePhoto + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('viewer-open');
    returnFocus?.focus({ preventScroll: true });
    scheduleAutoScroll();
  });

  const dedication = document.querySelector('.dedication');
  const loveButton = dedication.querySelector('.love-button');
  const burstContainer = document.querySelector('.heart-bursts');
  const heartShapes = [
    'M20 36C14 31 2 23 2 12C2 2 16 0 20 10C24 0 38 2 38 12C38 23 26 31 20 36Z',
    'M20 37L3 20L3 8L12 3L20 11L28 3L37 8L37 20Z',
    'M20 38C17 30 6 23 6 12C6 1 18 1 20 10C22 1 34 1 34 12C34 23 23 30 20 38Z',
    'M17 36C8 29 1 21 3 11C5 1 17 3 20 12C24 0 39 4 37 17C35 28 23 29 17 36Z',
    'M20 34C10 30 0 23 2 13C3 3 16 2 20 11C24 2 37 3 38 13C40 23 30 30 20 34Z'
  ];
  let loveSent = false;
  let exploding = false;
  let loveObserver = null;
  let loveAutoTimer = 0;

  function autoSendLove() {
    if (loveSent || !introComplete || document.hidden || document.documentElement.classList.contains('music-gated') || document.body.classList.contains('viewer-open')) return;
    const bounds = loveButton.getBoundingClientRect();
    const visibleHeight = Math.max(0, Math.min(bounds.bottom, window.innerHeight) - Math.max(bounds.top, 0));
    if (visibleHeight < bounds.height * 0.7) return;
    loveButton.click();
  }

  loveButton.addEventListener('click', () => {
    loveSent = true;
    loveObserver?.disconnect();
    clearTimeout(loveAutoTimer);
    dedication.querySelector('.love-response').textContent = 'You are so, so loved. Happy Teachers’ Day! ♡';
    if (motionPreference.matches || exploding) return;
    exploding = true;
    const bounds = loveButton.getBoundingClientRect();
    const explosion = document.createElement('div');
    explosion.className = 'heart-explosion';
    explosion.style.cssText = `left:${bounds.left + bounds.width / 2}px;top:${bounds.top + bounds.height / 2}px`;
    const bomb = document.createElement('span');
    bomb.className = 'burst-bomb';
    bomb.innerHTML = '<svg viewBox="0 0 64 72"><path class="bomb-fuse" d="M36 22C35 11 53 18 51 6"/><path class="bomb-spark" d="M51 1V5M58 5L54 7M57 13L53 10M44 2L47 6"/><path class="bomb-body" d="M24 24L24 19L38 19L38 25A23 23 0 1 1 24 24Z"/><path class="bomb-heart" d="M31 54C26 50 21 47 21 42C21 36 29 35 31 40C33 35 41 36 41 42C41 47 36 50 31 54Z"/></svg>';
    explosion.append(bomb);
    const ring = document.createElement('span');
    ring.className = 'explosion-ring';
    explosion.append(ring);
    const particleCount = window.innerWidth <= 700 ? 64 : 96;
    const radius = Math.min(640, Math.max(window.innerWidth, window.innerHeight) * 0.65);
    for (let index = 0; index < particleCount; index += 1) {
      const heart = document.createElement('span');
      heart.className = `burst-heart${Math.random() < 0.3 ? ' outlined' : ''}`;
      const angle = (index / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
      const distance = 100 + Math.random() * radius;
      const size = 12 + Math.random() * 30;
      const shape = heartShapes[Math.floor(Math.random() * heartShapes.length)];
      heart.innerHTML = `<svg viewBox="0 0 40 40" preserveAspectRatio="none"><path d="${shape}"/></svg>`;
      heart.style.cssText = `--dx:${Math.cos(angle) * distance}px;--dy:${Math.sin(angle) * distance}px;--fall:${80 + Math.random() * 130}px;--spin:${(Math.random() - 0.5) * 900}deg;--heart-width:${size}px;--heart-height:${size * (0.75 + Math.random() * 0.6)}px;--heart-color:${['#a43f4a', '#d77b94', '#b99a60', '#823c58', '#c78580'][index % 5]};--flight-time:${1.7 + Math.random() * 0.8}s;--blast-delay:${0.55 + Math.random() * 0.1}s`;
      explosion.append(heart);
    }
    loveButton.classList.add('is-exploding');
    burstContainer.append(explosion);
    window.setTimeout(() => {
      explosion.remove();
      loveButton.classList.remove('is-exploding');
      exploding = false;
    }, 3300);
  });
  if ('IntersectionObserver' in window) {
    loveObserver = new IntersectionObserver((entries) => {
      clearTimeout(loveAutoTimer);
      if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.7)) {
        loveAutoTimer = window.setTimeout(autoSendLove, 850);
      }
    }, { threshold: 0.7 });
    loveObserver.observe(loveButton);
  }
  dedication.addEventListener('focusin', autoSendLove);
  document.addEventListener('visibilitychange', autoSendLove);
  updateMusicGate();
  void playMusic();
})();
