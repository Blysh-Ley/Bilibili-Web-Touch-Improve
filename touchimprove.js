// ==UserScript==
// @name         Bilibili 视频触屏优化
// @namespace    http://tampermonkey.net/
// @version      2024-08-16
// @description  优化bilibili web的触屏体验
// @author       Blysh
// @match        *://*.bilibili.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==


function waitForHeaderPosition() {
    return new Promise((resolve) => {
        const intervalID = setInterval(() => {
            if (document.querySelector("#nav-searchform") != null) {
                let header_position;
                header_position = document.querySelector("#biliMainHeader > div.bili-header.fixed-header > div > ul.right-entry") || document.querySelector(".right-entry");

                if (header_position) {
                    clearInterval(intervalID);
                    resolve(header_position);
                }
            }
        }, 100);
    });
}
async function addRightENtryEventListener() {
    let right_entry = await waitForHeaderPosition();
    right_entry.addEventListener('click', function (event) {
        let target = event.target;
        // 向上查找直到找到 a 标签或者到达 document
        while (target && target !== document) {
            if (target.tagName.toLowerCase() === 'a') {
                const href = target.getAttribute('href');
                if (href && href.includes('//space')) {
                    event.preventDefault();
                    break;
                }
                if (href && href.includes('account/history')) {
                    event.preventDefault();
                    break;
                }
            }
            target = target.parentElement;
        }
    });
}

// 监听触屏长按事件
let longPressInterval, touchMoveInterval, touchMoveInterval2;
let intervals = [];
const longPressThreshold = 400; // 长按阈值，单位为毫秒
let gestureType = "none";
let playbackRate = "1x";
let touchStartX;
let touchStartY;
let lastTouchX;
let lastTouchY;
let lastDistance = 0;
let add_time = 0;
let touchStartTime;
let currentTime;
let textBox;
let photoShotStyle;
// 获取视频元素
const videoElement = document.querySelector('video');
let progressElement;
const currenturl = window.location.href //打开的网页
if (currenturl.includes("https://www.bilibili.com/correspond") || currenturl.includes("https://message.bilibili.com/pages/nav/header_sync")) { //排除两个网站
    return
}
if (!videoElement) {
    addRightENtryEventListener();
    return
}
// 为视频元素添加双击事件监听器
videoElement.addEventListener('dblclick', function (event) {
    // 阻止默认的双击全屏行为
    event.preventDefault();
    event.stopPropagation();
    preventCtrlMenu();
    // 切换视频的播放/暂停状态
    if (videoElement.paused) {
        videoElement.play();
    } else {
        videoElement.pause();
    }
});

// 为视频元素添加单击事件监听器
videoElement.addEventListener('click', function (event) {
    // 阻止默认的单击播放/暂停行为
    event.preventDefault();
    event.stopPropagation();
});

// 为视频元素添加右键菜单事件监听器
videoElement.addEventListener('contextmenu', function (event) {
    // 阻止默认的右键菜单行为
    event.preventDefault();
    event.stopPropagation();
});


const handler = {
    set(target, property, value) {
        target[property] = value;
        videoElement.removeEventListener('touchend', normolTouchEnd);
        if (property === 'gestureType' && value === 'longpress') {
            videoElement.addEventListener('touchend', longPressTouchEnd);
        }
        else if (property === 'gestureType' && value === 'swipe') {
            // 创建并触发 mouseenter 事件
            const mouseEnterEvent = new MouseEvent('mouseenter', {
                view: window,
                bubbles: true,
                cancelable: true
            });
            progressElement = document.querySelector(".bpx-player-progress");
            progressElement.dispatchEvent(mouseEnterEvent);

            let photoShot = document.querySelector(".bpx-player-progress-popup");
            photoShotStyle = document.createElement("style");
            photoShotStyle.innerHTML = `
                .bpx-player-progress-popup{
                    left: 50%!important;
                    bottom:350px!important;
                    overflow:visible!important;
                    transform: translate(-100%, 100%);
            }`;
            photoShot.appendChild(photoShotStyle);
            let photoShotSize = document.querySelector(".bpx-player-progress-preview-image");
            photoShotSize.style.height = "200%";
            let indicator = document.querySelector(".bpx-player-progress-move-indicator");
            indicator.style.display = "none";
            let previewTime = document.querySelector(".bpx-player-progress-preview-time");
            previewTime.style.display = "none";

            videoElement.addEventListener('touchend', swipeTouchEnd);
        }
        videoElement.addEventListener('touchend', normolTouchEnd);
        return true;
    }
};
const proxyGestureType = new Proxy({ gestureType }, handler);

const playbackRateHandler = {
    set(target, property, value) {
        target[property] = value;
        if (property === 'playbackRate' && value === '1x') {
            let playbackRateTextBox = createTextBox(null, "1x");
            fadeoutTextBox(playbackRateTextBox, 500);
        }
        if (property === 'playbackRate' && value === '2x') {
            let playbackRateTextBox = createTextBox(null, "2x");
            fadeoutTextBox(playbackRateTextBox, 500);
        }
        else if (property === 'playbackRate' && value === '3x') {
            let playbackRateTextBox = createTextBox(null, "3x");
            fadeoutTextBox(playbackRateTextBox, 500);
        }
        return true;
    }
};
const proxyPlaybackRate = new Proxy({ playbackRate }, playbackRateHandler);
//--------------------------------------------------------------

videoElement.addEventListener('touchstart', function (event) {
    currentTime = videoElement.currentTime;
    const touchCount = event.touches.length;
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
    touchStartTime = Date.now();
    if (touchCount === 1) {
        longPressInterval = setInterval(checkLongPress, 200);
        intervals.push(longPressInterval);
        touchMoveInterval = setInterval(checkOneFingerMovement, 50);
        intervals.push(touchMoveInterval);
    }
});
videoElement.addEventListener('touchmove', handleTouchMove);
videoElement.addEventListener('touchend', normolTouchEnd);
addRightENtryEventListener()

//--------------------------------------------------------------

function checkOneFingerMovement() {
    let deltaX = lastTouchX - touchStartX;
    let deltaY = lastTouchY - touchStartY;
    let direction;
    if (deltaX > 5) { direction = "right"; }
    else if (deltaX < -5) { direction = "left"; }
    else if (Math.abs(deltaY) > 10) {
        clearAllInterval();
        return;
    }
    else { return; }
    let distance = Math.abs(deltaX) - 5;
    if (lastDistance === 0) {
        lastDistance = distance;
        return
    }
    const move = Math.abs(distance - lastDistance);
    if (Math.abs(distance) > 5 && proxyGestureType.gestureType === 'none' && proxyGestureType.gestureType !== 'swipe') {
        proxyGestureType.gestureType = 'swipe';
        clearOtherInterval(touchMoveInterval);
    }
    if (direction === 'right' && move > 0.5) {
        add_time = distance * 0.1;
        let totalTime = currentTime + add_time;
        let positionRatio = totalTime / videoElement.duration;
        let start_X = progressElement.clientWidth * positionRatio;
        let videoRect = videoElement.getBoundingClientRect();
        const mouseEvent = new MouseEvent('mousemove', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: videoRect.left + start_X + 14
        });
        // 触发 mousemove 事件
        videoElement.dispatchEvent(mouseEvent);
        //preventCtrlMenu();
        let add_txt
        if (add_time + currentTime < videoElement.duration) {
            add_txt = sec2Time(add_time + currentTime) + " / " + sec2Time(videoElement.duration);
        }
        else {
            add_txt = sec2Time(videoElement.duration) + " / " + sec2Time(videoElement.duration);
        }
        textBox = createTextBox(textBox, add_txt);
    }

    if (direction === 'left' && move > 0.5) {
        add_time = -distance * 0.1;
        let totalTime = currentTime + add_time;
        let positionRatio = totalTime / videoElement.duration;
        let start_X = progressElement.clientWidth * positionRatio;
        let videoRect = videoElement.getBoundingClientRect();
        const mouseEvent = new MouseEvent('mousemove', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: videoRect.left + start_X + 14
        });
        videoElement.dispatchEvent(mouseEvent);
        //preventCtrlMenu();
        let add_txt
        if (currentTime + add_time < 0) {
            add_txt = "00:00 / " + sec2Time(videoElement.duration);
        }
        else {
            add_txt = sec2Time(add_time + currentTime) + " / " + sec2Time(videoElement.duration);
        }
        textBox = createTextBox(textBox, add_txt);
    }
    lastDistance = distance;
}

function checkLongPress() {
    let touchDuration = Date.now() - touchStartTime;
    if (touchDuration >= longPressThreshold && proxyGestureType.gestureType === 'none' && proxyGestureType.gestureType !== 'longpress') {
        // 触发长按事件
        proxyGestureType.gestureType = 'longpress';
        proxyPlaybackRate.playbackRate = '3x'
        videoElement.playbackRate = 3;
        clearOtherInterval(longPressInterval);
    }
    let deltaX = lastTouchX - touchStartX;
    let deltaY = lastTouchY - touchStartY;
    let direction = deltaX
    if (deltaY > 5) { direction = "down"; }
    else if (deltaY < -5) { direction = "up"; }
    else if (Math.abs(deltaX) > 20) { }
    else { }
    let distance = Math.abs(deltaX);
    if (lastDistance === 0) {
        lastDistance = distance;
    }
    const move = Math.abs(distance - lastDistance);
    if (Math.abs(distance) > 5 && direction === 'down') {
        if (proxyPlaybackRate.playbackRate !== '2x') {
            videoElement.playbackRate = 2;
            proxyPlaybackRate.playbackRate = '2x'
        }
    }
    if (Math.abs(distance) > 5 && direction === 'up') {
        if (proxyPlaybackRate.playbackRate !== '3x') {
            videoElement.playbackRate = 3;
            textBox = createTextBox(textBox, "3x");
            proxyPlaybackRate.playbackRate = '3x'
        }
    }
    lastDistance = distance;
}

function handleTouchMove(event) {
    event.preventDefault();
    event.stopPropagation();
    const touch = event.touches[0];
    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
}


//--------------------------------------------------------------

function longPressTouchEnd(event) {
    videoElement.playbackRate = 1;
    clearAllInterval();
    preventCtrlMenu();
    proxyGestureType.gestureType = 'none';
    proxyPlaybackRate.playbackRate = '1x'
    videoElement.removeEventListener('touchend', longPressTouchEnd)
}

function swipeTouchEnd(event) {
    const mouseEvent3 = new MouseEvent('mouseleave', { //不知为何放在eventlistener touchend里会导致程序卡死
        view: window,
        bubbles: true,
        cancelable: true,
    });
    progressElement.dispatchEvent(mouseEvent3);
    clearAllInterval();
    fadeoutTextBox(textBox);
    // 移除 touchend 事件监听器
    videoElement.currentTime = currentTime + add_time;
    add_time = 0;
    lastDistance = 0;
    proxyGestureType.gestureType = 'none';
    photoShotStyle.remove();
    videoElement.removeEventListener('touchend', swipeTouchEnd)
}

function normolTouchEnd(event) {
    clearAllInterval();
    videoElement.playbackRate = 1;
    proxyGestureType.gestureType = 'none';
}

//--------------------------------------------------------------

function clearAllInterval() {
    for (let i = 0; i < intervals.length; i++) {
        clearInterval(intervals[i]);
    }
}

function clearOtherInterval(except) {
    for (let i = 0; i < intervals.length; i++) {
        if (intervals[i] !== except) {
            clearInterval(intervals[i]);
        }
    }
}

function preventCtrlMenu() {
    const targetElement1 = document.querySelector('.bpx-player-control-entity');
    const observer1 = new MutationObserver(function (mutationsList) {
        for (let mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-shadow-show') {
                observer1.disconnect();
                targetElement1.setAttribute("data-shadow-show", true);
                observer1.observe(targetElement1, config1);
            }
        }
    });
    const config1 = { attributes: true };
    observer1.observe(targetElement1, config1);

    const targetElement2 = document.querySelector('.bpx-player-container');
    const observer2 = new MutationObserver(function (mutationsList) {
        for (let mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-ctrl-hidden') {
                observer2.disconnect();
                targetElement2.setAttribute("data-ctrl-hidden", true);
                observer2.observe(targetElement2, config2);
            }
        }
    });
    const config2 = { attributes: true };
    observer2.observe(targetElement2, config2);

    let observer3
    try {
        const targetElement3 = document.querySelector('.bpx-player-pbp.pin');
        observer3 = new MutationObserver(function (mutationsList) {
            for (let mutation of mutationsList) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    observer3.disconnect();
                    targetElement3.setAttribute("class", "bpx-player-pbp pin");
                    observer3.observe(targetElement3, config3);
                }
            }
        });
        const config3 = { attributes: true };
        observer3.observe(targetElement3, config3);
    }
    catch (err) { }
    setTimeout(function () {
        observer1.disconnect();
        observer2.disconnect();
        try {
            observer3.disconnect();
        }
        catch (err) { }
    }, 100);
}

// 创建一个显示文本的框
function createTextBox(oldtextBox = null, txt) {
    if (oldtextBox) {
        oldtextBox.remove();
    }
    const textBox = document.createElement('div');
    textBox.innerText = txt; // 设置文本内容
    // 设置文本框的样式
    textBox.style.position = 'absolute';
    if (isFullScreen()) {
        textBox.style.top = '80%'; // 距离视频顶部10px
    }
    else { textBox.style.top = '67%'; }
    textBox.style.left = '50%'; // 距离视频左侧10px
    textBox.style.padding = '5px';
    textBox.style.backgroundColor = 'rgba(255, 255, 255, 0.7)'; // 半透明白色背景
    textBox.style.border = '1px solid #ccc';
    textBox.style.borderRadius = '5px';
    textBox.style.zIndex = '1000'; // 确保文本框在视频上方
    textBox.style.pointerEvents = 'none';
    textBox.style.transform = 'translate(-50%, -50%)'; // 
    textBox.style.fontSize = '20px';
    // 将文本框添加到视频元素的父元素中
    videoElement.parentElement.style.position = 'relative'; // 确保父元素是相对定位
    videoElement.parentElement.appendChild(textBox);
    return textBox;
}


function fadeoutTextBox(textBox, timeout = 100) {
    // 2秒后将文本框从 DOM 中移除
    setTimeout(function () {
        textBox.remove();
    }, timeout);
}

function sec2Time(sec) {
    sec = Math.abs(sec);
    sec += 1;
    let h = Math.floor(sec / 3600);
    let m = Math.floor((sec % 3600) / 60);
    let s = Math.floor(sec % 60);
    m = m.toString().length === 1 ? m = "0" + m : m;
    s = s.toString().length === 1 ? s = "0" + s : s;
    h = h.toString().length === 1 ? h = "0" + h : h;
    if (m == 0) {
        return `00:${s}`;
    }
    if (h == 0) {
        return `${m}:${s}`;
    }
    else {
        return `${h}:${m}:${s}`;
    }
}

function isFullScreen() {
    return document.fullscreenElement != null;
}