// Floating Money Background Animation
(function() {
    const canvas = document.getElementById('money-background');
    if (!canvas) {
        console.warn('Canvas element not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    let notes = [];
    let lastTime = performance.now();
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    function createNote() {
        const size = 30 + Math.random() * 40;
        const types = [
            { text: '100K', color: '#c0ff00' },
            { text: '50K', color: '#a3d900' },
            { text: '20K', color: '#d9ff33' },
            { text: '10K', color: '#8fbc00' }
        ];
        const type = types[Math.floor(Math.random() * types.length)];
        
        return {
            x: Math.random() * canvas.width,
            y: canvas.height + size,
            vx: (Math.random() - 0.5) * 0.5,
            vy: 0.3 + Math.random() * 0.7,
            size: size,
            rotation: (Math.random() - 0.5) * 0.4,
            rotationSpeed: (Math.random() - 0.5) * 0.01,
            opacity: 0.03 + Math.random() * 0.05,
            type: type,
            sway: Math.sin(Math.random() * Math.PI * 2) * 0.3,
            swayPhase: Math.random() * Math.PI * 2
        };
    }
    
    function spawnNotes() {
        const count = Math.max(20, Math.min(50, Math.floor((canvas.width * canvas.height) / 100000)));
        while (notes.length < count) {
            notes.push(createNote());
        }
    }
    
    function drawNote(note) {
        ctx.save();
        ctx.globalAlpha = note.opacity * 0.4; // Reduced opacity for less blur effect
        ctx.translate(note.x, note.y);
        ctx.rotate(note.rotation);
        
        const w = note.size;
        const h = w * 0.45;
        
        // Bill background
        ctx.fillStyle = '#0f1a0f';
        ctx.fillRect(-w/2, -h/2, w, h);
        
        ctx.strokeStyle = note.type.color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-w/2, -h/2, w, h);
        
        // Text
        ctx.fillStyle = note.type.color;
        ctx.font = `bold ${w * 0.25}px 'Space Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(note.type.text, 0, 0);
        
        ctx.restore();
    }
    
    function update(deltaMs) {
        const delta = Math.min(deltaMs / 16.67, 3); // Cap at 3x normal speed
        
        for (let i = notes.length - 1; i >= 0; i--) {
            const note = notes[i];
            
            // Vertical movement
            note.y -= note.vy * delta;
            
            // Horizontal sway
            note.swayPhase += 0.01 * delta;
            note.x += Math.sin(note.swayPhase) * note.sway * delta;
            
            // Rotation
            note.rotation += note.rotationSpeed * delta;
            
            // Remove if off screen
            if (note.y < -note.size - 100) {
                notes.splice(i, 1);
            }
        }
    }
    
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        notes.forEach(note => drawNote(note));
    }
    
    function animate(now) {
        const deltaMs = now - lastTime;
        lastTime = now;
        
        update(deltaMs);
        draw();
        
        requestAnimationFrame(animate);
    }
    
    // Initialize
    resizeCanvas();
    spawnNotes();
    window.addEventListener('resize', () => {
        resizeCanvas();
        spawnNotes();
    });
    
    requestAnimationFrame(animate);
})();
