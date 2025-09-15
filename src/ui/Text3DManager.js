import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

/**
 * 3D Text Manager for VR-readable labels and UI
 */
export class Text3DManager {
    constructor() {
        this.fontLoader = new FontLoader();
        this.font = null;
        this.isLoading = false;
        this.pendingTexts = [];
        
        // Text styles
        this.styles = {
            title: {
                size: 0.4,
                height: 0.02,
                curveSegments: 8,
                bevelEnabled: false,
                color: 0xffffff
            },
            subtitle: {
                size: 0.25,
                height: 0.015,
                curveSegments: 6,
                bevelEnabled: false,
                color: 0xcccccc
            },
            label: {
                size: 0.15,
                height: 0.01,
                curveSegments: 4,
                bevelEnabled: false,
                color: 0x888888
            },
            info: {
                size: 0.12,
                height: 0.008,
                curveSegments: 4,
                bevelEnabled: false,
                color: 0x666666
            }
        };
        
        this.loadFont();
    }
    
    async loadFont() {
        if (this.isLoading || this.font) return;
        
        this.isLoading = true;
        
        try {
            // Try to load a web font first, fallback to helvetiker
            const fontPath = '/fonts/helvetiker_regular.typeface.json';
            
            this.font = await new Promise((resolve, reject) => {
                this.fontLoader.load(
                    fontPath,
                    (font) => resolve(font),
                    (progress) => console.log('Font loading:', progress),
                    (error) => {
                        console.warn('Could not load custom font, using fallback');
                        // Use a simple fallback - we'll create bitmap text instead
                        resolve(null);
                    }
                );
            });
            
            console.log('Font loaded successfully');
            
            // Process any pending text requests
            this.processPendingTexts();
            
        } catch (error) {
            console.error('Font loading failed:', error);
            this.font = null;
        }
        
        this.isLoading = false;
    }
    
    processPendingTexts() {
        this.pendingTexts.forEach(({ text, style, callback }) => {
            const textMesh = this.createText3D(text, style);
            callback(textMesh);
        });
        
        this.pendingTexts = [];
    }
    
    createText3D(text, styleName = 'label', options = {}) {
        const style = { ...this.styles[styleName], ...options };
        
        if (!this.font && !this.isLoading) {
            this.loadFont();
        }
        
        if (!this.font) {
            // Create fallback canvas-based text
            return this.createCanvasText(text, style);
        }
        
        const textGeometry = new TextGeometry(text, {
            font: this.font,
            size: style.size,
            height: style.height,
            curveSegments: style.curveSegments,
            bevelEnabled: style.bevelEnabled,
            bevelThickness: style.bevelThickness || 0.01,
            bevelSize: style.bevelSize || 0.005,
            bevelSegments: style.bevelSegments || 3
        });
        
        // Center the text
        textGeometry.computeBoundingBox();
        const centerOffsetX = -0.5 * (textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x);
        const centerOffsetY = -0.5 * (textGeometry.boundingBox.max.y - textGeometry.boundingBox.min.y);
        textGeometry.translate(centerOffsetX, centerOffsetY, 0);
        
        const textMaterial = new THREE.MeshPhongMaterial({
            color: style.color,
            transparent: true,
            opacity: style.opacity || 0.9
        });
        
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.name = `text3d_${text.replace(/\s+/g, '_')}`;
        
        return textMesh;
    }
    
    createCanvasText(text, style) {
        // Fallback: Create text using Canvas texture
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Set canvas size based on text
        const fontSize = Math.floor(style.size * 100);
        canvas.width = Math.max(256, text.length * fontSize * 0.6);
        canvas.height = fontSize * 1.5;
        
        // Style the text
        context.font = `${fontSize}px Arial, sans-serif`;
        context.fillStyle = `#${style.color.toString(16).padStart(6, '0')}`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Add background for better readability in VR
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw text
        context.fillStyle = `#${style.color.toString(16).padStart(6, '0')}`;
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        // Create plane geometry for the text
        const planeGeometry = new THREE.PlaneGeometry(
            style.size * text.length * 0.8,
            style.size * 1.2
        );
        
        const planeMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: style.opacity || 0.9
        });
        
        const textMesh = new THREE.Mesh(planeGeometry, planeMaterial);
        textMesh.name = `canvasText_${text.replace(/\s+/g, '_')}`;
        
        return textMesh;
    }
    
    createBillboardText(text, styleName = 'label', options = {}) {
        const textMesh = this.createText3D(text, styleName, options);
        
        // Make text always face the camera
        const billboard = new THREE.Group();
        billboard.add(textMesh);
        billboard.userData.isBillboard = true;
        billboard.name = `billboard_${text.replace(/\s+/g, '_')}`;
        
        return billboard;
    }
    
    createFloatingLabel(text, position, styleName = 'label', options = {}) {
        const label = this.createBillboardText(text, styleName, options);
        label.position.copy(position);
        
        // Add subtle floating animation
        const startY = position.y;
        label.userData.floatAnimation = {
            startY: startY,
            time: Math.random() * Math.PI * 2
        };
        
        return label;
    }
    
    createInfoPanel(title, content, position, options = {}) {
        const panelGroup = new THREE.Group();
        panelGroup.name = `infoPanel_${title.replace(/\s+/g, '_')}`;
        
        // Background panel
        const panelWidth = options.width || 2;
        const panelHeight = options.height || 1.5;
        
        const bgGeometry = new THREE.PlaneGeometry(panelWidth, panelHeight);
        const bgMaterial = new THREE.MeshBasicMaterial({
            color: options.backgroundColor || 0x000000,
            transparent: true,
            opacity: options.backgroundOpacity || 0.8
        });
        const background = new THREE.Mesh(bgGeometry, bgMaterial);
        panelGroup.add(background);
        
        // Border
        const borderGeometry = new THREE.EdgesGeometry(bgGeometry);
        const borderMaterial = new THREE.LineBasicMaterial({
            color: options.borderColor || 0xffffff,
            transparent: true,
            opacity: 0.6
        });
        const border = new THREE.LineSegments(borderGeometry, borderMaterial);
        border.position.z = 0.001;
        panelGroup.add(border);
        
        // Title
        const titleMesh = this.createText3D(title, 'subtitle', {
            color: options.titleColor || 0xffffff
        });
        titleMesh.position.set(0, panelHeight * 0.3, 0.01);
        panelGroup.add(titleMesh);
        
        // Content (split into lines if needed)
        const lines = content.split('\n');
        const lineHeight = 0.2;
        const startY = panelHeight * 0.1;
        
        lines.forEach((line, index) => {
            if (line.trim()) {
                const lineMesh = this.createText3D(line, 'info', {
                    color: options.contentColor || 0xcccccc
                });
                lineMesh.position.set(0, startY - index * lineHeight, 0.01);
                panelGroup.add(lineMesh);
            }
        });
        
        panelGroup.position.copy(position);
        panelGroup.userData.isInfoPanel = true;
        
        return panelGroup;
    }
    
    createDataSourceLabel(source, position) {
        const text = `Data: ${source}`;
        return this.createFloatingLabel(text, position, 'info', {
            color: 0x888888,
            opacity: 0.7
        });
    }
    
    createConceptTitle(conceptName, systemType, position) {
        const title = `${conceptName}`;
        const subtitle = systemType ? `(${systemType})` : '';
        
        const titleGroup = new THREE.Group();
        
        // Main title
        const titleMesh = this.createBillboardText(title, 'title', {
            color: 0xffffff
        });
        titleMesh.position.y = 0.3;
        titleGroup.add(titleMesh);
        
        // Subtitle
        if (subtitle) {
            const subtitleMesh = this.createBillboardText(subtitle, 'subtitle', {
                color: 0xcccccc
            });
            subtitleMesh.position.y = -0.1;
            titleGroup.add(subtitleMesh);
        }
        
        titleGroup.position.copy(position);
        titleGroup.name = `conceptTitle_${conceptName.replace(/\s+/g, '_')}`;
        
        return titleGroup;
    }
    
    updateBillboards(camera) {
        // Update all billboard texts to face camera
        const cameraPosition = camera.position;
        
        this.scene?.traverse((child) => {
            if (child.userData.isBillboard) {
                child.lookAt(cameraPosition);
            }
        });
    }
    
    updateFloatingAnimations(deltaTime) {
        // Update floating label animations
        this.scene?.traverse((child) => {
            if (child.userData.floatAnimation) {
                const anim = child.userData.floatAnimation;
                anim.time += deltaTime;
                
                const floatOffset = Math.sin(anim.time * 2) * 0.05;
                child.position.y = anim.startY + floatOffset;
            }
        });
    }
    
    setScene(scene) {
        this.scene = scene;
    }
    
    dispose() {
        // Clean up any resources
        if (this.font) {
            // Fonts don't need explicit disposal in Three.js
        }
        
        this.pendingTexts = [];
        console.log('Text3D Manager disposed');
    }
}

export default Text3DManager;
