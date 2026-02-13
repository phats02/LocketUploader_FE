import React, { useState, useRef, useCallback, useEffect } from "react";
import styles from "./ImageCropper.module.scss";
import classNames from "classnames/bind";

const cx = classNames.bind(styles);

const ImageCropper = ({ imageSrc, onCropComplete, frameSize = 500, inline = false }) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

    const containerRef = useRef(null);
    const imageRef = useRef(null);

    const FRAME_SIZE = frameSize;

    // Load image and calculate initial scale to fit frame
    useEffect(() => {
        const img = new Image();
        img.onload = () => {
            setImageSize({ width: img.width, height: img.height });

            // Calculate initial scale to cover the frame
            const scaleX = FRAME_SIZE / img.width;
            const scaleY = FRAME_SIZE / img.height;
            const initialScale = Math.max(scaleX, scaleY);
            setScale(initialScale);
            setPosition({ x: 0, y: 0 });
        };
        img.src = imageSrc;
    }, [imageSrc, FRAME_SIZE]);

    // Handle mouse/touch events for dragging
    const handleMouseDown = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        setDragStart({
            x: clientX - position.x,
            y: clientY - position.y,
        });
    }, [position]);

    const handleMouseMove = useCallback((e) => {
        if (!isDragging) return;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const newX = clientX - dragStart.x;
        const newY = clientY - dragStart.y;

        // Calculate bounds to keep image covering the frame
        const scaledWidth = imageSize.width * scale;
        const scaledHeight = imageSize.height * scale;
        const maxX = Math.max(0, (scaledWidth - FRAME_SIZE) / 2);
        const maxY = Math.max(0, (scaledHeight - FRAME_SIZE) / 2);

        setPosition({
            x: Math.max(-maxX, Math.min(maxX, newX)),
            y: Math.max(-maxY, Math.min(maxY, newY)),
        });
    }, [isDragging, dragStart, imageSize, scale, FRAME_SIZE]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Handle zoom
    const handleZoom = (e) => {
        const newScale = parseFloat(e.target.value);
        setScale(newScale);

        // Recalculate position bounds with new scale
        const scaledWidth = imageSize.width * newScale;
        const scaledHeight = imageSize.height * newScale;
        const maxX = Math.max(0, (scaledWidth - FRAME_SIZE) / 2);
        const maxY = Math.max(0, (scaledHeight - FRAME_SIZE) / 2);

        setPosition((prev) => ({
            x: Math.max(-maxX, Math.min(maxX, prev.x)),
            y: Math.max(-maxY, Math.min(maxY, prev.y)),
        }));
    };

    // Get min scale that covers the frame
    const getMinScale = () => {
        if (imageSize.width === 0 || imageSize.height === 0) return 0.1;
        const scaleX = FRAME_SIZE / imageSize.width;
        const scaleY = FRAME_SIZE / imageSize.height;
        return Math.max(scaleX, scaleY);
    };

    // Crop the image to 1:1 frame - output at high resolution
    const getCroppedImage = useCallback(() => {
        return new Promise((resolve) => {
            const img = imageRef.current;
            if (!img) {
                resolve(null);
                return;
            }

            // Calculate the source rectangle in original image coordinates
            const scaledWidth = imageSize.width * scale;
            const scaledHeight = imageSize.height * scale;

            // Center of the frame in the scaled image coordinates
            const frameCenterX = scaledWidth / 2 - position.x;
            const frameCenterY = scaledHeight / 2 - position.y;

            // Source rectangle in original image coordinates
            const srcX = (frameCenterX - FRAME_SIZE / 2) / scale;
            const srcY = (frameCenterY - FRAME_SIZE / 2) / scale;
            const srcWidth = FRAME_SIZE / scale;
            const srcHeight = FRAME_SIZE / scale;

            // Output at the actual source resolution (NOT the display frame size)
            // This preserves image quality. Cap at 1080px for reasonable file size.
            const OUTPUT_SIZE = Math.min(Math.round(srcWidth), 1080);

            const canvas = document.createElement("canvas");
            canvas.width = OUTPUT_SIZE;
            canvas.height = OUTPUT_SIZE;
            const ctx = canvas.getContext("2d");

            ctx.drawImage(
                img,
                srcX,
                srcY,
                srcWidth,
                srcHeight,
                0,
                0,
                OUTPUT_SIZE,
                OUTPUT_SIZE
            );

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        const croppedFile = new File([blob], "cropped-image.jpg", {
                            type: "image/jpeg",
                        });
                        resolve(croppedFile);
                    } else {
                        resolve(null);
                    }
                },
                "image/jpeg",
                0.95
            );
        });
    }, [imageSize, scale, position, FRAME_SIZE]);

    // Notify parent when crop changes (debounced effect)
    useEffect(() => {
        if (onCropComplete && imageSize.width > 0) {
            getCroppedImage().then((file) => {
                if (file) {
                    onCropComplete(file);
                }
            });
        }
    }, [position, scale, imageSize, getCroppedImage, onCropComplete]);

    const minScale = getMinScale();

    return (
        <div className={cx("cropper-inline")}>
            <p className={cx("hint")}>Drag to reposition • Use slider to zoom</p>

            <div
                className={cx("frame-container")}
                ref={containerRef}
                style={{ width: FRAME_SIZE, height: FRAME_SIZE }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchMove={handleMouseMove}
                onTouchEnd={handleMouseUp}
            >
                <div
                    className={cx("image-wrapper")}
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    }}
                >
                    <img
                        ref={imageRef}
                        src={imageSrc}
                        alt="crop preview"
                        className={cx("crop-image")}
                        draggable={false}
                        crossOrigin="anonymous"
                    />
                </div>
                <div className={cx("frame-overlay")} />
            </div>

            <div className={cx("zoom-controls")}>
                <span className={cx("zoom-icon")}>−</span>
                <input
                    type="range"
                    min={minScale}
                    max={minScale * 3}
                    step={0.01}
                    value={scale}
                    onChange={handleZoom}
                    className={cx("zoom-slider")}
                />
                <span className={cx("zoom-icon")}>+</span>
            </div>
        </div>
    );
};

export default ImageCropper;
