import * as THREE from 'three';
import EventEmitter from 'eventemitter3';
import { XR_BUTTONS } from 'gamepad-wrapper';

/**
 * VR Controller Manager for Quest-optimized navigation and interaction
 */
export class VRControllerManager extends EventEmitter {
    constructor(scene, camera, renderer, controllers, player) {
        super();
        
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.controllers = controllers;
        this.player = player;
        
        // Movement settings
        this.moveSpeed = 2.0;
        this.turnSpeed = 1.0;
        this.smoothDamping = 0.8;
        
        // Interaction settings
        this.raycaster = new THREE.Raycaster();
        this.raycaster.far = 50; // Increase range for distant objects
        
        // Movement state
        this.velocity = new THREE.Vector3();
        this.isMoving = false;
        this.isTurning = false;
        
        // Visual feedback
        this.createControllerVisuals();
        
        console.log('VR Controller Manager initialized');
    }
    
    createControllerVisuals() {
        // Create ray visualizers for both controllers
        this.rayVisuals = new Map();
        
        ['left', 'right'].forEach(hand => {
            if (this.controllers[hand]) {
                const rayGeometry = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(0, 0, 0),
                    new THREE.Vector3(0, 0, -5)
                ]);
                
                const rayMaterial = new THREE.LineBasicMaterial({
                    color: hand === 'right' ? 0x00ff00 : 0xff0000,
                    transparent: true,
                    opacity: 0.5
                });
                
                const rayLine = new THREE.Line(rayGeometry, rayMaterial);
                rayLine.visible = false; // Hidden by default
                
                this.controllers[hand].raySpace.add(rayLine);
                this.rayVisuals.set(hand, rayLine);
            }
        });
    }
    
    update(deltaTime) {
        // Handle controller input
        this.handleControllerInput(deltaTime);
        
        // Update movement
        this.updateMovement(deltaTime);
        
        // Update ray casting
        this.updateRayCasting();
    }
    
    handleControllerInput(deltaTime) {
        // Right controller - Primary interaction and movement
        if (this.controllers.right?.gamepad) {
            const rightGamepad = this.controllers.right.gamepad;
            
            // Thumbstick locomotion using correct API
            try {
                const moveX = rightGamepad.getAxis('THUMBSTICK_RIGHT_X') || 0;
                const moveZ = -(rightGamepad.getAxis('THUMBSTICK_RIGHT_Y') || 0); // Invert for natural feel
                
                // Apply movement if thumbstick moved significantly
                if (Math.abs(moveX) > 0.1 || Math.abs(moveZ) > 0.1) {
                    this.handleLocomotion(moveX, moveZ, deltaTime);
                }
            } catch (error) {
                // Fallback if thumbstick axes not available
                console.warn('Right thumbstick not available:', error);
            }
            
            // Button interactions using existing API
            if (rightGamepad.getButtonClick(XR_BUTTONS.TRIGGER)) {
                this.handleTriggerPress('right');
            }
            
            if (rightGamepad.getButtonClick(XR_BUTTONS.SQUEEZE)) {
                this.handleGripPress('right');
            }
            
            if (rightGamepad.getButtonClick(XR_BUTTONS.BUTTON_1)) {
                this.handleMenuPress('right');
            }
            
            if (rightGamepad.getButtonClick(XR_BUTTONS.BUTTON_2)) {
                this.handleBackPress('right');
            }
        }
        
        // Left controller - Secondary interactions and turning
        if (this.controllers.left?.gamepad) {
            const leftGamepad = this.controllers.left.gamepad;
            
            // Left thumbstick for turning
            try {
                const turnX = leftGamepad.getAxis('THUMBSTICK_LEFT_X') || 0;
                
                if (Math.abs(turnX) > 0.2) {
                    this.handleTurning(turnX, deltaTime);
                }
            } catch (error) {
                // Fallback if thumbstick axes not available
                console.warn('Left thumbstick not available:', error);
            }
            
            // Left trigger - Alternative selection
            if (leftGamepad.getButtonClick(XR_BUTTONS.TRIGGER)) {
                this.handleTriggerPress('left');
            }
        }
    }
    
    handleLocomotion(moveX, moveZ, deltaTime) {
        // Get player forward direction
        const forward = new THREE.Vector3(0, 0, -1);
        const right = new THREE.Vector3(1, 0, 0);
        
        // Apply player rotation to movement vectors
        forward.applyQuaternion(this.player.quaternion);
        right.applyQuaternion(this.player.quaternion);
        
        // Calculate movement vector
        const moveVector = new THREE.Vector3();
        moveVector.addScaledVector(right, moveX);
        moveVector.addScaledVector(forward, moveZ);
        moveVector.normalize();
        
        // Apply movement with speed
        const speed = this.moveSpeed * deltaTime;
        this.player.position.addScaledVector(moveVector, speed);
        
        // Emit movement event
        this.emit('playerMoved', {
            position: this.player.position.clone(),
            direction: moveVector
        });
        
        this.isMoving = true;
    }
    
    handleTurning(turnX, deltaTime) {
        // Smooth turning
        const turnAmount = turnX * this.turnSpeed * deltaTime;
        this.player.rotateY(-turnAmount); // Negative for natural direction
        
        this.emit('playerTurned', {
            rotation: this.player.rotation.y,
            amount: turnAmount
        });
        
        this.isTurning = true;
    }
    
    handleTriggerPress(hand) {
        const controller = this.controllers[hand];
        if (!controller) return;
        
        // Show ray visual temporarily
        const rayVisual = this.rayVisuals.get(hand);
        if (rayVisual) {
            rayVisual.visible = true;
            setTimeout(() => {
                rayVisual.visible = false;
            }, 200);
        }
        
        // Perform raycast
        this.performRaycast(hand, 'trigger');
    }
    
    handleGripPress(hand) {
        const controller = this.controllers[hand];
        if (!controller) return;
        
        // Teleport or special action
        this.performRaycast(hand, 'grip');
        
        this.emit('gripPressed', { hand, controller });
    }
    
    handleMenuPress(hand) {
        this.emit('menuPressed', { hand });
    }
    
    handleBackPress(hand) {
        this.emit('backPressed', { hand });
    }
    
    performRaycast(hand, action) {
        const controller = this.controllers[hand];
        if (!controller) return;
        
        // Set up raycaster from controller
        const raySpace = controller.raySpace;
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.identity().extractRotation(raySpace.matrixWorld);
        
        this.raycaster.ray.origin.setFromMatrixPosition(raySpace.matrixWorld);
        this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
        
        // Get all interactable objects (this will be populated by ConceptDimensionalizer)
        const intersectableObjects = this.getIntersectableObjects();
        
        // Perform intersection test
        const intersections = this.raycaster.intersectObjects(intersectableObjects, true);
        
        if (intersections.length > 0) {
            const intersection = intersections[0];
            
            this.emit('controllerInteraction', {
                hand,
                action,
                intersection,
                controller,
                distance: intersection.distance
            });
            
            console.log(`${hand} controller ${action}:`, intersection.object.name || 'unnamed object');
            
            // Visual feedback
            this.createInteractionFeedback(intersection.point);
        } else {
            // No intersection - emit empty interaction for UI handling
            this.emit('controllerInteraction', {
                hand,
                action,
                intersection: null,
                controller
            });
        }
    }
    
    createInteractionFeedback(point) {
        // Create temporary visual feedback at interaction point
        const feedbackGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const feedbackMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00,
            transparent: true,
            opacity: 0.8 
        });
        
        const feedbackSphere = new THREE.Mesh(feedbackGeometry, feedbackMaterial);
        feedbackSphere.position.copy(point);
        
        this.scene.add(feedbackSphere);
        
        // Animate and remove
        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / 500; // 500ms duration
            
            if (progress < 1) {
                feedbackSphere.scale.setScalar(1 + progress * 2);
                feedbackSphere.material.opacity = 0.8 * (1 - progress);
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(feedbackSphere);
                feedbackGeometry.dispose();
                feedbackMaterial.dispose();
            }
        };
        
        animate();
    }
    
    updateMovement(deltaTime) {
        // Apply movement damping
        if (!this.isMoving) {
            this.velocity.multiplyScalar(this.smoothDamping);
            
            // Stop very small velocities
            if (this.velocity.length() < 0.01) {
                this.velocity.set(0, 0, 0);
            }
        }
        
        this.isMoving = false;
        this.isTurning = false;
    }
    
    updateRayCasting() {
        // Update ray visual states based on controller pointing
        ['left', 'right'].forEach(hand => {
            const rayVisual = this.rayVisuals.get(hand);
            const controller = this.controllers[hand];
            
            if (rayVisual && controller) {
                // Show ray when pointing at interactable objects
                const raySpace = controller.raySpace;
                const tempMatrix = new THREE.Matrix4();
                tempMatrix.identity().extractRotation(raySpace.matrixWorld);
                
                this.raycaster.ray.origin.setFromMatrixPosition(raySpace.matrixWorld);
                this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
                
                const intersections = this.raycaster.intersectObjects(this.getIntersectableObjects(), true);
                
                // Show ray if pointing at something interactive
                const hasIntersection = intersections.length > 0;
                rayVisual.visible = hasIntersection;
                
                // Emit hover events for UI feedback
                if (hasIntersection) {
                    this.emit('controllerHover', {
                        hand,
                        intersection: intersections[0],
                        controller
                    });
                } else {
                    this.emit('controllerExit', { hand, controller });
                }
                
                // Color code based on interaction type
                if (intersections.length > 0) {
                    const intersection = intersections[0];
                    const distance = intersection.distance;
                    
                    // Green for close, yellow for medium, red for far
                    if (distance < 3) {
                        rayVisual.material.color.setHex(0x00ff00);
                    } else if (distance < 10) {
                        rayVisual.material.color.setHex(0xffff00);
                    } else {
                        rayVisual.material.color.setHex(0xff6600);
                    }
                    
                    rayVisual.material.opacity = 0.8;
                } else {
                    rayVisual.material.opacity = 0.3;
                }
            }
        });
    }
    
    getIntersectableObjects() {
        // This will be populated by ConceptDimensionalizer
        return this._intersectableObjects || [];
    }
    
    setIntersectableObjects(objects) {
        this._intersectableObjects = objects;
    }
    
    // Teleportation system
    teleportTo(position) {
        if (position instanceof THREE.Vector3) {
            this.player.position.copy(position);
            this.player.position.y = Math.max(this.player.position.y, 0); // Keep above ground
            
            this.emit('playerTeleported', {
                position: this.player.position.clone()
            });
        }
    }
    
    // Get current player state
    getPlayerState() {
        return {
            position: this.player.position.clone(),
            rotation: this.player.rotation.clone(),
            isMoving: this.isMoving,
            isTurning: this.isTurning
        };
    }
    
    // Comfort settings
    setComfortSettings(settings) {
        this.moveSpeed = settings.moveSpeed || this.moveSpeed;
        this.turnSpeed = settings.turnSpeed || this.turnSpeed;
        this.smoothDamping = settings.smoothDamping || this.smoothDamping;
        
        // Apply snap turning if requested
        if (settings.snapTurning) {
            this.setupSnapTurning(settings.snapAngle || 30);
        }
    }
    
    setupSnapTurning(snapAngle) {
        // Convert smooth turning to snap turning for comfort
        this.snapAngle = (snapAngle * Math.PI) / 180; // Convert to radians
        this.snapTurning = true;
        this.lastSnapTime = 0;
    }
    
    dispose() {
        // Clean up ray visuals
        this.rayVisuals.forEach((rayVisual, hand) => {
            if (rayVisual.parent) {
                rayVisual.parent.remove(rayVisual);
            }
            rayVisual.geometry.dispose();
            rayVisual.material.dispose();
        });
        
        this.rayVisuals.clear();
        this.removeAllListeners();
        
        console.log('VR Controller Manager disposed');
    }
}

export default VRControllerManager;
