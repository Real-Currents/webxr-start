import * as THREE from 'three';
import { Text3DManager } from './Text3DManager.js';

/**
 * Flat Rectangular Navigation Menu for Single Visualization Display
 * Provides category selection and next/previous navigation
 */
export class NavigationMenu {
    constructor(scene, textManager) {
        this.scene = scene;
        this.textManager = textManager;
        
        // Menu state
        this.currentCategory = 'economic';
        this.currentIndex = 0;
        this.visible = true;
        
        // Category definitions with clear labels
        this.categories = {
            economic: {
                name: 'Economic Systems',
                items: [
                    { key: 'economic-mixed', label: 'Mixed Economy', description: 'Balanced market & regulation' },
                    { key: 'economic-capitalist', label: 'Market Economy', description: 'Free market capitalism' },
                    { key: 'economic-socialist', label: 'Social Economy', description: 'Democratic socialism' },
                    { key: 'economic-planned', label: 'Planned Economy', description: 'Central planning system' }
                ]
            },
            ecological: {
                name: 'Ecological Networks',
                items: [
                    { key: 'ecological-forest', label: 'Forest Ecosystem', description: 'Temperate forest food web' },
                    { key: 'ecological-ocean', label: 'Marine Ecosystem', description: 'Ocean food chain dynamics' },
                    { key: 'ecological-grassland', label: 'Grassland Ecosystem', description: 'Prairie & savanna systems' },
                    { key: 'ecological-wetland', label: 'Wetland Ecosystem', description: 'Marsh & bog habitats' }
                ]
            },
            topology: {
                name: 'Mathematical Topology',
                items: [
                    { key: 'topology-torus', label: 'Torus Surface', description: 'Donut-shaped manifold' },
                    { key: 'topology-sphere', label: 'Spherical Surface', description: 'Perfect sphere geometry' },
                    { key: 'topology-mobius', label: 'Möbius Strip', description: 'One-sided twisted surface' },
                    { key: 'topology-klein', label: 'Klein Bottle', description: 'Non-orientable surface' }
                ]
            },
            social: {
                name: 'Social Networks',
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
        
        this.createMenu();
    }
    
    createMenu() {
        this.menuGroup = new THREE.Group();
        this.menuGroup.name = 'navigationMenu';
        
        // Menu background panel
        const panelGeometry = new THREE.PlaneGeometry(8, 2.5);
        const panelMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.9
        });
        const panel = new THREE.Mesh(panelGeometry, panelMaterial);
        this.menuGroup.add(panel);
        
        // Menu border
        const borderGeometry = new THREE.EdgesGeometry(panelGeometry);
        const borderMaterial = new THREE.LineBasicMaterial({ 
            color: 0x4477ff,
            linewidth: 2 
        });
        const border = new THREE.LineSegments(borderGeometry, borderMaterial);
        border.position.z = 0.001;
        this.menuGroup.add(border);
        
        // Category selection buttons
        this.createCategoryButtons();
        
        // Current visualization info
        this.createVisualizationInfo();
        
        // Navigation controls
        this.createNavigationControls();
        
        // Attribution link
        this.createAttributionLink();
        
        // Position menu in front of user at comfortable viewing distance
        this.menuGroup.position.set(0, 2, -3);
        this.scene.add(this.menuGroup);
        
        // Update display for current selection
        this.updateMenuDisplay();
    }
    
    createCategoryButtons() {
        const categories = Object.keys(this.categories);
        const buttonWidth = 1.5;
        const spacing = 0.2;
        const totalWidth = categories.length * buttonWidth + (categories.length - 1) * spacing;
        const startX = -totalWidth / 2 + buttonWidth / 2;
        
        categories.forEach((categoryKey, index) => {
            const category = this.categories[categoryKey];
            const x = startX + index * (buttonWidth + spacing);
            
            // Button background
            const buttonGeometry = new THREE.PlaneGeometry(buttonWidth, 0.4);
            const buttonMaterial = new THREE.MeshBasicMaterial({
                color: categoryKey === this.currentCategory ? 0x4477ff : 0x333333,
                transparent: true,
                opacity: 0.8
            });
            const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
            button.position.set(x, 0.8, 0.01);
            button.userData = {
                interactive: true,
                type: 'categoryButton',
                categoryKey: categoryKey
            };
            this.menuGroup.add(button);
            
            // Button label
            const label = this.textManager.createText3D(category.name, 'info', {
                color: 0xffffff,
                size: 0.08
            });
            label.position.set(x, 0.8, 0.02);
            this.menuGroup.add(label);
            
            // Store for interaction
            this.interactiveElements.set(button, {
                type: 'categoryButton',
                action: () => this.selectCategory(categoryKey),
                material: buttonMaterial
            });
        });
    }
    
    createVisualizationInfo() {
        // Current visualization title
        this.titleText = this.textManager.createText3D('Loading...', 'title', {
            color: 0xffffff,
            size: 0.15
        });
        this.titleText.position.set(0, 0.3, 0.01);
        this.menuGroup.add(this.titleText);
        
        // Description text
        this.descriptionText = this.textManager.createText3D('Loading...', 'subtitle', {
            color: 0xcccccc,
            size: 0.1
        });
        this.descriptionText.position.set(0, 0.05, 0.01);
        this.menuGroup.add(this.descriptionText);
        
        // Progress indicator (X of Y)
        this.progressText = this.textManager.createText3D('1 of 4', 'info', {
            color: 0x888888,
            size: 0.08
        });
        this.progressText.position.set(0, -0.2, 0.01);
        this.menuGroup.add(this.progressText);
    }
    
    createNavigationControls() {
        // Previous button
        const prevButtonGeometry = new THREE.PlaneGeometry(0.8, 0.3);
        const prevButtonMaterial = new THREE.MeshBasicMaterial({
            color: 0x666666,
            transparent: true,
            opacity: 0.8
        });
        const prevButton = new THREE.Mesh(prevButtonGeometry, prevButtonMaterial);
        prevButton.position.set(-2.5, -0.5, 0.01);
        prevButton.userData = {
            interactive: true,
            type: 'prevButton'
        };
        this.menuGroup.add(prevButton);
        
        // Previous button label
        const prevLabel = this.textManager.createText3D('◄ Previous', 'info', {
            color: 0xffffff,
            size: 0.08
        });
        prevLabel.position.set(-2.5, -0.5, 0.02);
        this.menuGroup.add(prevLabel);
        
        // Next button
        const nextButtonGeometry = new THREE.PlaneGeometry(0.8, 0.3);
        const nextButtonMaterial = new THREE.MeshBasicMaterial({
            color: 0x666666,
            transparent: true,
            opacity: 0.8
        });
        const nextButton = new THREE.Mesh(nextButtonGeometry, nextButtonMaterial);
        nextButton.position.set(2.5, -0.5, 0.01);
        nextButton.userData = {
            interactive: true,
            type: 'nextButton'
        };
        this.menuGroup.add(nextButton);
        
        // Next button label
        const nextLabel = this.textManager.createText3D('Next ►', 'info', {
            color: 0xffffff,
            size: 0.08
        });
        nextLabel.position.set(2.5, -0.5, 0.02);
        this.menuGroup.add(nextLabel);
        
        // Store for interaction
        this.interactiveElements.set(prevButton, {
            type: 'prevButton',
            action: () => this.previousVisualization(),
            material: prevButtonMaterial
        });
        
        this.interactiveElements.set(nextButton, {
            type: 'nextButton',
            action: () => this.nextVisualization(),
            material: nextButtonMaterial
        });
    }
    
    createAttributionLink() {
        // Attribution button
        const attrButtonGeometry = new THREE.PlaneGeometry(1.5, 0.25);
        const attrButtonMaterial = new THREE.MeshBasicMaterial({
            color: 0x2d5aa0,
            transparent: true,
            opacity: 0.8
        });
        const attrButton = new THREE.Mesh(attrButtonGeometry, attrButtonMaterial);
        attrButton.position.set(0, -0.9, 0.01);
        attrButton.userData = {
            interactive: true,
            type: 'attributionButton'
        };
        this.menuGroup.add(attrButton);
        
        // Attribution label
        const attrLabel = this.textManager.createText3D('📖 Sources & Citations', 'info', {
            color: 0xffffff,
            size: 0.07
        });
        attrLabel.position.set(0, -0.9, 0.02);
        this.menuGroup.add(attrLabel);
        
        // Store for interaction
        this.interactiveElements.set(attrButton, {
            type: 'attributionButton',
            action: () => this.openAttributions(),
            material: attrButtonMaterial
        });
    }
    
    updateMenuDisplay() {
        const category = this.categories[this.currentCategory];
        const currentItem = category.items[this.currentIndex];
        
        // Update title
        if (this.titleText) {
            this.menuGroup.remove(this.titleText);
            this.titleText.geometry.dispose();
            this.titleText.material.dispose();
        }
        this.titleText = this.textManager.createText3D(currentItem.label, 'title', {
            color: 0xffffff,
            size: 0.15
        });
        this.titleText.position.set(0, 0.3, 0.01);
        this.menuGroup.add(this.titleText);
        
        // Update description
        if (this.descriptionText) {
            this.menuGroup.remove(this.descriptionText);
            this.descriptionText.geometry.dispose();
            this.descriptionText.material.dispose();
        }
        this.descriptionText = this.textManager.createText3D(currentItem.description, 'subtitle', {
            color: 0xcccccc,
            size: 0.1
        });
        this.descriptionText.position.set(0, 0.05, 0.01);
        this.menuGroup.add(this.descriptionText);
        
        // Update progress indicator
        if (this.progressText) {
            this.menuGroup.remove(this.progressText);
            this.progressText.geometry.dispose();
            this.progressText.material.dispose();
        }
        const progressInfo = `${this.currentIndex + 1} of ${category.items.length} | ${category.name}`;
        this.progressText = this.textManager.createText3D(progressInfo, 'info', {
            color: 0x888888,
            size: 0.08
        });
        this.progressText.position.set(0, -0.2, 0.01);
        this.menuGroup.add(this.progressText);
        
        // Update category button highlights
        this.updateCategoryHighlights();
    }
    
    updateCategoryHighlights() {
        this.interactiveElements.forEach((data, element) => {
            if (data.type === 'categoryButton') {
                const isActive = element.userData.categoryKey === this.currentCategory;
                data.material.color.setHex(isActive ? 0x4477ff : 0x333333);
            }
        });
    }
    
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
        }
        
        console.log('Opening attributions page...');
    }
    
    getCurrentSelection() {
        const category = this.categories[this.currentCategory];
        return {
            category: this.currentCategory,
            index: this.currentIndex,
            item: category.items[this.currentIndex]
        };
    }
    
    handleInteraction(intersection) {
        const object = intersection.object;
        const elementData = this.interactiveElements.get(object);
        
        if (elementData && elementData.action) {
            // Visual feedback
            const originalColor = elementData.material.color.getHex();
            elementData.material.color.setHex(0xffffff);
            
            setTimeout(() => {
                elementData.material.color.setHex(originalColor);
            }, 100);
            
            // Execute action
            elementData.action();
            return true;
        }
        
        return false;
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
        
        // Clear event listeners
        this._eventListeners = {};
        this.interactiveElements.clear();
        
        console.log('Navigation Menu disposed');
    }
}

export default NavigationMenu;
