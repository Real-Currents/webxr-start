import * as THREE from 'three';
import { Text3DManager } from './Text3DManager.js';

/**
 * Human-Centered Flat Rectangular Navigation Menu for Single Visualization Display
 * Ergonomically positioned with VR controller ray-casting support
 */
export class NavigationMenu {
    constructor(scene, textManager, player) {
        this.scene = scene;
        this.textManager = textManager;
        this.player = player;
        
        // Menu state
        this.currentCategory = 'economic';
        this.currentIndex = 0;
        this.visible = true;
        
        // Human-centered positioning
        this.ergonomicOffset = {
            distance: -3.0,    // Comfortable arm's reach
            height: -0.6,       // Slightly above eye level for natural downward gaze
            angle: 0          // Straight ahead initially
        };
        
        // Category definitions with clear labels
        this.categories = {
            economic: {
                name: 'Economic Systems',
                color: 0xff6b35,
                items: [
                    { key: 'economic-mixed', label: 'Mixed Economy', description: 'Balanced market & regulation' },
                    { key: 'economic-capitalist', label: 'Market Economy', description: 'Free market capitalism' },
                    { key: 'economic-socialist', label: 'Social Economy', description: 'Democratic socialism' },
                    { key: 'economic-planned', label: 'Planned Economy', description: 'Central planning system' }
                ]
            },
            ecological: {
                name: 'Ecological Networks',
                color: 0x4caf50,
                items: [
                    { key: 'ecological-forest', label: 'Forest Ecosystem', description: 'Temperate forest food web' },
                    { key: 'ecological-ocean', label: 'Marine Ecosystem', description: 'Ocean food chain dynamics' },
                    { key: 'ecological-grassland', label: 'Grassland Ecosystem', description: 'Prairie & savanna systems' },
                    { key: 'ecological-wetland', label: 'Wetland Ecosystem', description: 'Marsh & bog habitats' }
                ]
            },
            topology: {
                name: 'Mathematical Topology',
                color: 0x2196f3,
                items: [
                    { key: 'topology-torus', label: 'Torus Surface', description: 'Donut-shaped manifold' },
                    { key: 'topology-sphere', label: 'Spherical Surface', description: 'Perfect sphere geometry' },
                    { key: 'topology-mobius', label: 'Möbius Strip', description: 'One-sided twisted surface' },
                    { key: 'topology-klein', label: 'Klein Bottle', description: 'Non-orientable surface' }
                ]
            },
            social: {
                name: 'Social Networks',
                color: 0x9c27b0,
                items: [
                    { key: 'social-media', label: 'Social Media Network', description: 'Online social connections' },
                    { key: 'social-professional', label: 'Professional Network', description: 'Workplace relationships' },
                    { key: 'social-family', label: 'Family Network', description: 'Kinship connections' },
                    { key: 'social-academic', label: 'Academic Network', description: 'Research collaborations' }
                ]
            }
        };
        
        // UI elements
        this.menuGroup = null;
        this.interactiveElements = new Map();
        this.hoverStates = new Map();
        this.categoryButtons = new Map();
        
        this.createMenu();
    }
    
    createMenu() {
        this.menuGroup = new THREE.Group();
        this.menuGroup.name = 'navigationMenu';
        
        // Human-centered ergonomic positioning
        this.positionMenuErgonomically();
        
        // Menu background panel with rounded corners effect
        const panelGeometry = new THREE.PlaneGeometry(9, 3);
        const panelMaterial = new THREE.MeshBasicMaterial({
            color: 0x1a1a1a,
            transparent: true,
            opacity: 0.95
        });
        const panel = new THREE.Mesh(panelGeometry, panelMaterial);
        panel.name = 'menuBackground';
        this.menuGroup.add(panel);
        
        // Menu border with glow effect
        const borderGeometry = new THREE.EdgesGeometry(panelGeometry);
        const borderMaterial = new THREE.LineBasicMaterial({ 
            color: 0x4477ff,
            linewidth: 3,
            transparent: true,
            opacity: 0.8
        });
        const border = new THREE.LineSegments(borderGeometry, borderMaterial);
        border.position.z = 0.001;
        border.name = 'menuBorder';
        this.menuGroup.add(border);
        
        // Create all menu components
        this.createCategoryButtons();
        this.createVisualizationInfo();
        this.createNavigationControls();
        this.createAttributionLink(this.menuGroup);
        this.createInstructions(this.menuGroup);
        
        // Add to scene
        this.scene.add(this.menuGroup);
        
        // Update display for current selection
        this.updateMenuDisplay();
        
        console.log('Human-centered navigation menu created with VR controller support');
    }
    
    positionMenuErgonomically() {
        // Position menu at ergonomic viewing angle and distance
        this.updateMenuPosition();
        
        // Ensure menu always faces user
        this.menuGroup.lookAt(this.player.position);
    }
    
    updateMenuPosition() {
        const playerPos = this.player.position.clone();
        const forward = new THREE.Vector3(0, 0, this.ergonomicOffset.distance);
        forward.applyQuaternion(this.player.quaternion);
        
        const menuPos = playerPos.clone().add(forward);
        menuPos.y = playerPos.y + this.ergonomicOffset.height;
        
        this.menuGroup.position.copy(menuPos);
        this.menuGroup.lookAt(playerPos);

        // this.scene.remove(this.navigationMenu.menuGroup);

        // TODO: Position menu
        this.menuGroup.position.set(0.0, 0.0, -2.0);
        this.menuGroup.rotateX(-(Math.PI/4));
    }
    
    createCategoryButtons() {
        const categories = Object.keys(this.categories);
        const buttonWidth = 1.8;
        const spacing = 0.15;
        const totalWidth = categories.length * buttonWidth + (categories.length - 1) * spacing;
        const startX = -totalWidth / 2 + buttonWidth / 2;
        
        categories.forEach((categoryKey, index) => {
            const category = this.categories[categoryKey];
            const x = startX + index * (buttonWidth + spacing);
            
            // Button background with category color accent
            const buttonGeometry = new THREE.PlaneGeometry(buttonWidth, 0.5);
            const buttonMaterial = new THREE.MeshBasicMaterial({
                color: categoryKey === this.currentCategory ? category.color : 0x333333,
                transparent: true,
                opacity: 0.9
            });
            const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
            button.position.set(x, 0.9, 0.02);
            button.userData = {
                interactive: true,
                type: 'categoryButton',
                categoryKey: categoryKey,
                originalColor: categoryKey === this.currentCategory ? category.color : 0x333333,
                hoverColor: category.color,
                activeColor: 0xffffff
            };
            this.menuGroup.add(button);
            
            // Button border for visual definition
            const buttonBorderGeometry = new THREE.EdgesGeometry(buttonGeometry);
            const buttonBorderMaterial = new THREE.LineBasicMaterial({
                color: categoryKey === this.currentCategory ? 0xffffff : 0x666666,
                transparent: true,
                opacity: 0.6
            });
            const buttonBorder = new THREE.LineSegments(buttonBorderGeometry, buttonBorderMaterial);
            buttonBorder.position.set(x, 0.9, 0.03);
            this.menuGroup.add(buttonBorder);
            
            // Button label with better typography
            const label = this.textManager.createText3D(category.name, 'label', {
                color: 0xffffff,
                size: 0.09
            });
            label.position.set(x, 0.9, 0.04);
            this.menuGroup.add(label);
            
            // Store for interaction and hover effects
            this.interactiveElements.set(button, {
                type: 'categoryButton',
                action: () => this.selectCategory(categoryKey),
                material: buttonMaterial,
                borderMaterial: buttonBorderMaterial,
                categoryKey: categoryKey
            });
            
            this.categoryButtons.set(categoryKey, {
                button: button,
                material: buttonMaterial,
                borderMaterial: buttonBorderMaterial
            });
        });
    }
    
    createVisualizationInfo() {
        // Current visualization title with larger, more readable text
        this.titleText = this.textManager.createText3D('Loading...', 'title', {
            color: 0xffffff,
            size: 0.18
        });
        this.titleText.position.set(0, 0.35, 0.02);
        this.menuGroup.add(this.titleText);
        
        // Description text with improved spacing
        this.descriptionText = this.textManager.createText3D('Loading...', 'subtitle', {
            color: 0xdddddd,
            size: 0.12
        });
        this.descriptionText.position.set(0, 0.05, 0.02);
        this.menuGroup.add(this.descriptionText);
        
        // Progress indicator with category context
        this.progressText = this.textManager.createText3D('1 of 4', 'info', {
            color: 0x999999,
            size: 0.09
        });
        this.progressText.position.set(0, -0.25, 0.02);
        this.menuGroup.add(this.progressText);
    }
    
    createNavigationControls() {
        // Previous button with VR-friendly sizing
        const prevButtonGeometry = new THREE.PlaneGeometry(1.2, 0.4);
        const prevButtonMaterial = new THREE.MeshBasicMaterial({
            color: 0x555555,
            transparent: true,
            opacity: 0.9
        });
        const prevButton = new THREE.Mesh(prevButtonGeometry, prevButtonMaterial);
        prevButton.position.set(-3.0, -0.6, 0.02);
        prevButton.userData = {
            interactive: true,
            type: 'prevButton',
            originalColor: 0x555555,
            hoverColor: 0x777777,
            activeColor: 0x999999
        };
        this.menuGroup.add(prevButton);
        
        // Previous button border
        const prevBorderGeometry = new THREE.EdgesGeometry(prevButtonGeometry);
        const prevBorderMaterial = new THREE.LineBasicMaterial({
            color: 0x888888,
            transparent: true,
            opacity: 0.7
        });
        const prevBorder = new THREE.LineSegments(prevBorderGeometry, prevBorderMaterial);
        prevBorder.position.set(-3.0, -0.6, 0.03);
        this.menuGroup.add(prevBorder);
        
        // Previous button label
        const prevLabel = this.textManager.createText3D('◄ Previous', 'label', {
            color: 0xffffff,
            size: 0.1
        });
        prevLabel.position.set(-3.0, -0.6, 0.04);
        this.menuGroup.add(prevLabel);
        
        // Next button
        const nextButtonGeometry = new THREE.PlaneGeometry(1.2, 0.4);
        const nextButtonMaterial = new THREE.MeshBasicMaterial({
            color: 0x555555,
            transparent: true,
            opacity: 0.9
        });
        const nextButton = new THREE.Mesh(nextButtonGeometry, nextButtonMaterial);
        nextButton.position.set(3.0, -0.6, 0.02);
        nextButton.userData = {
            interactive: true,
            type: 'nextButton',
            originalColor: 0x555555,
            hoverColor: 0x777777,
            activeColor: 0x999999
        };
        this.menuGroup.add(nextButton);
        
        // Next button border
        const nextBorderGeometry = new THREE.EdgesGeometry(nextButtonGeometry);
        const nextBorderMaterial = new THREE.LineBasicMaterial({
            color: 0x888888,
            transparent: true,
            opacity: 0.7
        });
        const nextBorder = new THREE.LineSegments(nextBorderGeometry, nextBorderMaterial);
        nextBorder.position.set(3.0, -0.6, 0.03);
        this.menuGroup.add(nextBorder);
        
        // Next button label
        const nextLabel = this.textManager.createText3D('Next ►', 'label', {
            color: 0xffffff,
            size: 0.1
        });
        nextLabel.position.set(3.0, -0.6, 0.04);
        this.menuGroup.add(nextLabel);
        
        // Store for interaction
        this.interactiveElements.set(prevButton, {
            type: 'prevButton',
            action: () => this.previousVisualization(),
            material: prevButtonMaterial,
            borderMaterial: prevBorderMaterial
        });
        
        this.interactiveElements.set(nextButton, {
            type: 'nextButton',
            action: () => this.nextVisualization(),
            material: nextButtonMaterial,
            borderMaterial: nextBorderMaterial
        });
    }
    
    createAttributionLink(group) {

        const attributionGroup = new THREE.Group();

        // Attribution button with distinctive styling
        const attrButtonGeometry = new THREE.PlaneGeometry(2.0, 0.35);
        const attrButtonMaterial = new THREE.MeshBasicMaterial({
            color: 0x2d5aa0,
            transparent: true,
            opacity: 0.9
        });
        const attrButton = new THREE.Mesh(attrButtonGeometry, attrButtonMaterial);
        attrButton.position.set(0, -1.1, 0.02);
        attrButton.userData = {
            interactive: true,
            type: 'attributionButton',
            originalColor: 0x2d5aa0,
            hoverColor: 0x3d6ab0,
            activeColor: 0x4d7ac0
        };
        attributionGroup.add(attrButton);
        
        // Attribution border
        const attrBorderGeometry = new THREE.EdgesGeometry(attrButtonGeometry);
        const attrBorderMaterial = new THREE.LineBasicMaterial({
            color: 0x5577dd,
            transparent: true,
            opacity: 0.8
        });
        const attrBorder = new THREE.LineSegments(attrBorderGeometry, attrBorderMaterial);
        attrBorder.position.set(0, -1.1, 0.03);
        attributionGroup.add(attrBorder);
        
        // Attribution label
        const attrLabel = this.textManager.createText3D('📖 Sources & Citations', 'label', {
            color: 0xffffff,
            size: 0.08
        });
        attrLabel.position.set(0, -1.1, 0.04);
        attributionGroup.add(attrLabel);

        attributionGroup.translateY(0.5);

        group.add(attributionGroup);
        
        // Store for interaction
        this.interactiveElements.set(attrButton, {
            type: 'attributionButton',
            action: () => this.openAttributions(),
            material: attrButtonMaterial,
            borderMaterial: attrBorderMaterial
        });
    }
    
    createInstructions(group) {
        // VR controller instructions
        const instructionsText = this.textManager.createText3D(
            'Point controller at buttons • Pull trigger to select • Menu button to toggle', 
            'info', 
            {
                color: 0x888888,
                size: 0.07
            }
        );
        instructionsText.position.set(0, -1.35, 0.02);
        group.add(instructionsText);
    }
    
    updateMenuDisplay() {
        const category = this.categories[this.currentCategory];
        const currentItem = category.items[this.currentIndex];
        
        // Update title with fade effect
        if (this.titleText) {
            this.menuGroup.remove(this.titleText);
            if (this.titleText.geometry) this.titleText.geometry.dispose();
            if (this.titleText.material) this.titleText.material.dispose();
        }
        this.titleText = this.textManager.createText3D(currentItem.label, 'title', {
            color: 0xffffff,
            size: 0.18
        });
        this.titleText.position.set(0, 0.35, 0.02);
        this.menuGroup.add(this.titleText);
        
        // Update description
        if (this.descriptionText) {
            this.menuGroup.remove(this.descriptionText);
            if (this.descriptionText.geometry) this.descriptionText.geometry.dispose();
            if (this.descriptionText.material) this.descriptionText.material.dispose();
        }
        this.descriptionText = this.textManager.createText3D(currentItem.description, 'subtitle', {
            color: 0xdddddd,
            size: 0.12
        });
        this.descriptionText.position.set(0, 0.05, 0.02);
        this.menuGroup.add(this.descriptionText);
        
        // Update progress indicator
        if (this.progressText) {
            this.menuGroup.remove(this.progressText);
            if (this.progressText.geometry) this.progressText.geometry.dispose();
            if (this.progressText.material) this.progressText.material.dispose();
        }
        const progressInfo = `${this.currentIndex + 1} of ${category.items.length} • ${category.name}`;
        this.progressText = this.textManager.createText3D(progressInfo, 'info', {
            color: 0x999999,
            size: 0.09
        });
        this.progressText.position.set(0, -0.25, 0.02);
        this.menuGroup.add(this.progressText);
        
        // Update category button highlights
        this.updateCategoryHighlights();
    }
    
    updateCategoryHighlights() {
        Object.keys(this.categories).forEach(categoryKey => {
            const categoryData = this.categoryButtons.get(categoryKey);
            if (categoryData) {
                const isActive = categoryKey === this.currentCategory;
                const targetColor = isActive ? this.categories[categoryKey].color : 0x333333;
                const borderColor = isActive ? 0xffffff : 0x666666;
                
                categoryData.material.color.setHex(targetColor);
                categoryData.borderMaterial.color.setHex(borderColor);
            }
        });
    }
    
    // VR Controller Interaction Methods
    
    handleControllerHover(intersection) {
        const object = intersection.object;
        const elementData = this.interactiveElements.get(object);
        
        if (elementData && !this.hoverStates.get(object)) {
            // Start hover effect
            this.hoverStates.set(object, true);
            
            const hoverColor = object.userData.hoverColor || 0xffffff;
            elementData.material.color.setHex(hoverColor);
            
            if (elementData.borderMaterial) {
                elementData.borderMaterial.opacity = 1.0;
            }
            
            console.log(`Hovering over: ${elementData.type}`);
            return true;
        }
        
        return false;
    }
    
    handleControllerExit(intersection) {
        const object = intersection.object;
        const elementData = this.interactiveElements.get(object);
        
        if (elementData && this.hoverStates.get(object)) {
            // End hover effect
            this.hoverStates.set(object, false);
            
            let originalColor = object.userData.originalColor || 0x333333;
            
            // Special handling for category buttons
            if (elementData.type === 'categoryButton') {
                const isActive = elementData.categoryKey === this.currentCategory;
                originalColor = isActive ? this.categories[elementData.categoryKey].color : 0x333333;
            }
            
            elementData.material.color.setHex(originalColor);
            
            if (elementData.borderMaterial) {
                elementData.borderMaterial.opacity = 0.7;
            }
            
            return true;
        }
        
        return false;
    }
    
    handleControllerInteraction(intersection) {
        const object = intersection.object;
        const elementData = this.interactiveElements.get(object);
        
        if (elementData && elementData.action) {
            // Visual feedback - flash to active color
            const activeColor = object.userData.activeColor || 0xffffff;
            const originalColor = elementData.material.color.getHex();
            
            elementData.material.color.setHex(activeColor);
            
            setTimeout(() => {
                // Restore color based on current state
                if (elementData.type === 'categoryButton') {
                    const isActive = elementData.categoryKey === this.currentCategory;
                    const restoreColor = isActive ? this.categories[elementData.categoryKey].color : 0x333333;
                    elementData.material.color.setHex(restoreColor);
                } else {
                    elementData.material.color.setHex(originalColor);
                }
            }, 150);
            
            // Execute action
            elementData.action();
            
            console.log(`Activated: ${elementData.type}`);
            return true;
        }
        
        return false;
    }
    
    // Menu Logic Methods
    
    selectCategory(categoryKey) {
        if (this.currentCategory === categoryKey) return;
        
        this.currentCategory = categoryKey;
        this.currentIndex = 0; // Reset to first item in new category
        this.updateMenuDisplay();
        
        // Emit category change event
        this.emit('categoryChanged', {
            category: categoryKey,
            item: this.categories[categoryKey].items[0]
        });
        
        console.log(`Category changed to: ${categoryKey}`);
    }
    
    nextVisualization() {
        const category = this.categories[this.currentCategory];
        this.currentIndex = (this.currentIndex + 1) % category.items.length;
        this.updateMenuDisplay();
        
        // Emit visualization change event
        this.emit('visualizationChanged', {
            category: this.currentCategory,
            index: this.currentIndex,
            item: category.items[this.currentIndex]
        });
        
        console.log(`Next visualization: ${category.items[this.currentIndex].label}`);
    }
    
    previousVisualization() {
        const category = this.categories[this.currentCategory];
        this.currentIndex = (this.currentIndex - 1 + category.items.length) % category.items.length;
        this.updateMenuDisplay();
        
        // Emit visualization change event
        this.emit('visualizationChanged', {
            category: this.currentCategory,
            index: this.currentIndex,
            item: category.items[this.currentIndex]
        });
        
        console.log(`Previous visualization: ${category.items[this.currentIndex].label}`);
    }
    
    openAttributions() {
        // Open attributions page in new browser tab
        if (typeof window !== 'undefined') {
            const attributionsURL = window.location.origin + '/pages/attributions.html';
            window.open(attributionsURL, '_blank', 'width=1200,height=800,scrollbars=yes');
            console.log('Opened attributions page in new tab');
        } else {
            console.log('Attribution link activated (window not available)');
        }
    }
    
    // Utility Methods
    
    getCurrentSelection() {
        const category = this.categories[this.currentCategory];
        return {
            category: this.currentCategory,
            index: this.currentIndex,
            item: category.items[this.currentIndex]
        };
    }
    
    getInteractiveObjects() {
        return Array.from(this.interactiveElements.keys());
    }
    
    setVisible(visible) {
        this.visible = visible;
        this.menuGroup.visible = visible;
    }
    
    toggleVisibility() {
        this.setVisible(!this.visible);
    }
    
    update(deltaTime) {
        // Update menu position to maintain ergonomic viewing
        if (this.visible) {
            this.updateMenuPosition();
        }
    }
    
    // Event emitter functionality
    emit(eventName, data) {
        if (this._eventListeners && this._eventListeners[eventName]) {
            this._eventListeners[eventName].forEach(callback => callback(data));
        }
    }
    
    on(eventName, callback) {
        if (!this._eventListeners) this._eventListeners = {};
        if (!this._eventListeners[eventName]) this._eventListeners[eventName] = [];
        this._eventListeners[eventName].push(callback);
    }
    
    off(eventName, callback) {
        if (!this._eventListeners || !this._eventListeners[eventName]) return;
        const index = this._eventListeners[eventName].indexOf(callback);
        if (index > -1) {
            this._eventListeners[eventName].splice(index, 1);
        }
    }
    
    dispose() {
        // Clean up geometries and materials
        this.menuGroup.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => material.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
        
        // Remove from scene
        if (this.menuGroup.parent) {
            this.menuGroup.parent.remove(this.menuGroup);
        }
        
        // Clear event listeners and state
        this._eventListeners = {};
        this.interactiveElements.clear();
        this.hoverStates.clear();
        this.categoryButtons.clear();
        
        console.log('Navigation Menu disposed');
    }
}

export default NavigationMenu;
