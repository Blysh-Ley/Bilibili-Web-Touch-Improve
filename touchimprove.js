class VideoGestureHandler {
    constructor(videoElement) {
        this.videoElement = videoElement;
        this.longPressInterval = null;
        this.touchMoveInterval = null;
        this.intervals = [];
        this.longPressThreshold = 400; // 长按阈值，单位为毫秒
        this.gestureType = "none";
        this.playbackRate = "1x";
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.lastTouchX = 0;
        this.lastTouchY = 0;
        this.lastDistance = 0;
        this.add_time = 0;
        this.touchStartTime = 0;
        this.currenttime = 0;
        this.textBox = null;
        this.photoShotStyle = null;
        this.progressElement = null;

        this.swipeTouchEnd = this.swipeTouchEnd.bind(this);
        this.longPressTouchEnd = this.longPressTouchEnd.bind(this);
        this.normolTouchEnd = this.normolTouchEnd.bind(this);

        this.proxyGestureType = new Proxy({ gestureType: this.gestureType }, this.handler());
        this.proxyPlaybackRate = new Proxy({ playbackRate: this.playbackRate }, this.playbackRateHandler());
        this.videoElement.addEventListener('dblclick', event => {
            // 阻止默认的双击全屏行为
            event.preventDefault();
            event.stopPropagation();
            // 切换视频的播放/暂停状态
            if (this.videoElement.paused) {
                this.videoElement.play();
            } else {
                this.videoElement.pause();
            }
        })
        this.videoElement.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
        })
        this.videoElement.addEventListener('contextmenu', event => {
            event.preventDefault();
            event.stopPropagation();
        })
        this.videoElement.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.videoElement.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.videoElement.addEventListener('touchend', this.normolTouchEnd);
    }

    //! ------------------Proxy函数------------------

    handler() {
        return {
            set: (target, property, value) => {
                target[property] = value;
                this.videoElement.removeEventListener('touchend', this.normolTouchEnd);
                if (property === 'gestureType' && value === 'longpress') {
                    this.videoElement.addEventListener('touchend', this.longPressTouchEnd);
                }
                else if (property === 'gestureType' && value === 'swipe') {
                    // 创建并触发 mouseenter 事件
                    const mouseEnterEvent = new MouseEvent('mouseenter', {
                        view: window,
                        bubbles: true,
                        cancelable: true
                    });
                    this.progressElement = document.querySelector(".bpx-player-progress");
                    this.progressElement.dispatchEvent(mouseEnterEvent);
                    // 将photoshot固定显示在屏幕下方
                    this.photoShot = document.querySelector(".bpx-player-progress-popup");
                    this.photoShotStyle = document.createElement("style");
                    this.photoShotStyle.innerHTML = `
                        .bpx-player-progress-popup{
                            left: 50%!important;
                            bottom:350px!important;
                            overflow:visible!important;
                            transform: translate(-100%, 100%);
                    }`;
                    this.photoShot.appendChild(this.photoShotStyle);
                    // photoshot放大两倍
                    this.photoShotSize = document.querySelector(".bpx-player-progress-preview-image");
                    this.photoShotSize.style.height = "200%";
                    // 隐藏进度条上的指示器和预览时间
                    this.indicator = document.querySelector(".bpx-player-progress-move-indicator");
                    //this.indicator.style.display = "none";
                    this.previewTime = document.querySelector(".bpx-player-progress-preview-time");
                    this.previewTime.style.display = "none";
                    // 添加touchend事件监听器
                    this.videoElement.addEventListener('touchend', this.swipeTouchEnd);
                }
                this.videoElement.addEventListener('touchend', this.normolTouchEnd);
                return true;
            }
        };
    }

    playbackRateHandler() {
        return {
            set: (target, property, value) => {
                target[property] = value;
                if (property === 'playbackRate' && value === '1x') {
                    let playbackRateTextBox = this.createTextBox(null, "1x");
                    this.fadeoutTextBox(playbackRateTextBox, 500);
                }
                if (property === 'playbackRate' && value === '2x') {
                    let playbackRateTextBox = this.createTextBox(null, "2x");
                    this.fadeoutTextBox(playbackRateTextBox, 500);
                } else if (property === 'playbackRate' && value === '3x') {
                    let playbackRateTextBox = this.createTextBox(null, "3x");
                    this.fadeoutTextBox(playbackRateTextBox, 500);
                }
                return true;
            }
        };
    }

    //! ------------------EventListener函数------------------

    //* 触摸开始
    handleTouchStart(event) {
        this.currenttime = this.videoElement.currentTime;
        const touchCount = event.touches.length;
        const touch = event.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.lastTouchX = touch.clientX;
        this.lastTouchY = touch.clientY;
        this.touchStartTime = Date.now();
        if (touchCount === 1) {
            this.longPressInterval = setInterval(this.checkLongPress.bind(this), 200);
            this.intervals.push(this.longPressInterval);
            this.touchMoveInterval = setInterval(this.checkOneFingerMovement.bind(this), 50);
            this.intervals.push(this.touchMoveInterval);
        }
    }
    //* 触摸移动
    handleTouchMove(event) {
        event.preventDefault();
        event.stopPropagation();
        const touch = event.touches[0];
        this.lastTouchX = touch.clientX;
        this.lastTouchY = touch.clientY;
    }
    //* 单指左右移动调整时间
    checkOneFingerMovement() {
        let deltaX = this.lastTouchX - this.touchStartX;
        let deltaY = this.lastTouchY - this.touchStartY;
        let direction;
        if (deltaX > 5) { direction = "right"; }
        else if (deltaX < -5) { direction = "left"; }
        else if (Math.abs(deltaY) > 10) {
            this.clearAllInterval();
            return;
        }
        else { return; }
        let distance = Math.abs(deltaX) - 5;
        if (this.lastDistance === 0) {
            this.lastDistance = distance;
            return;
        }
        const move = Math.abs(distance - this.lastDistance); //确保手指有移动
        if (Math.abs(distance) > 5 && this.proxyGestureType.gestureType === 'none' && this.proxyGestureType.gestureType !== 'swipe') {
            this.proxyGestureType.gestureType = 'swipe';
            this.clearOtherInterval(this.touchMoveInterval);
        }

        if ((direction === 'right' || direction === 'left') && move > 0.5) {
            this.add_time = direction === 'right' ? distance * 0.1 : -distance * 0.1;
            let totalTime = this.currenttime + this.add_time;
            let positionRatio = totalTime / this.videoElement.duration;
            let start_X = this.progressElement.clientWidth * positionRatio;
            let videoRect = this.videoElement.getBoundingClientRect();
            
            // 模拟鼠标在进度条移动事件
            const mouseEvent = new MouseEvent('mousemove', {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: videoRect.left + start_X + 14
            });
            this.videoElement.dispatchEvent(mouseEvent);
            
            let add_txt;
            if (this.add_time + this.currenttime < 0) {
                add_txt = "00:00 / " + this.sec2Time(this.videoElement.duration);
            } else if (this.add_time + this.currenttime < this.videoElement.duration) {
                add_txt = this.sec2Time(this.add_time + this.currenttime) + " / " + this.sec2Time(this.videoElement.duration);
            } else {
                add_txt = this.sec2Time(this.videoElement.duration) + " / " + this.sec2Time(this.videoElement.duration);
            }
            this.textBox = this.createTextBox(this.textBox, add_txt);
        }
        this.lastDistance = distance;
    }
    //* 单指长按倍速播放
    checkLongPress() {
        let touchDuration = Date.now() - this.touchStartTime;
        if (touchDuration >= this.longPressThreshold && this.proxyGestureType.gestureType === 'none' && this.proxyGestureType.gestureType !== 'longpress') {
            this.proxyGestureType.gestureType = 'longpress';
            this.proxyPlaybackRate.playbackRate = '3x';
            this.videoElement.playbackRate = 3;
            this.clearOtherInterval(this.longPressInterval);
        }
        let deltaX = this.lastTouchX - this.touchStartX;
        let deltaY = this.lastTouchY - this.touchStartY;
        let direction = deltaX;
        if (deltaY > 5) { direction = "down"; }
        else if (deltaY < -5) { direction = "up"; }
        let distance = Math.abs(deltaX);
        if (this.lastDistance === 0) {
            this.lastDistance = distance;
        }
        const move = Math.abs(distance - this.lastDistance);
        if (Math.abs(distance) > 5 && direction === 'down') {
            if (this.proxyPlaybackRate.playbackRate !== '2x') {
                this.videoElement.playbackRate = 2;
                this.proxyPlaybackRate.playbackRate = '2x';
            }
        }
        if (Math.abs(distance) > 5 && direction === 'up') {
            if (this.proxyPlaybackRate.playbackRate !== '3x') {
                this.videoElement.playbackRate = 3;
                this.textBox = this.createTextBox(this.textBox, "3x");
                this.proxyPlaybackRate.playbackRate = '3x';
            }
        }
        this.lastDistance = distance;
    }

    //! ------------------END函数------------------

    longPressTouchEnd(event) {
        this.videoElement.playbackRate = 1;
        this.clearAllInterval();
        this.preventCtrlMenu();
        this.proxyGestureType.gestureType = 'none';
        this.proxyPlaybackRate.playbackRate = '1x';
        this.videoElement.removeEventListener('touchend', this.longPressTouchEnd);
    }

    swipeTouchEnd(event) {
        const mouseEvent3 = new MouseEvent('mouseleave', {
            view: window,
            bubbles: true,
            cancelable: true,
        });
        this.progressElement.dispatchEvent(mouseEvent3);
        this.clearAllInterval();
        this.fadeoutTextBox(this.textBox);
        this.videoElement.currentTime = this.currenttime + this.add_time;
        this.add_time = 0;
        this.lastDistance = 0;
        this.proxyGestureType.gestureType = 'none';
        this.photoShotStyle.remove();
        this.photoShotSize.style.height = "100%";
        this.videoElement.removeEventListener('touchend', this.swipeTouchEnd);
    }

    normolTouchEnd(event) {
        this.clearAllInterval();
        this.videoElement.playbackRate = 1;
        this.proxyGestureType.gestureType = 'none';
    }

    //! ------------------工具函数------------------

    clearAllInterval() {
        for (let i = 0; i < this.intervals.length; i++) {
            clearInterval(this.intervals[i]);
        }
    }

    clearOtherInterval(except) {
        for (let i = 0; i < this.intervals.length; i++) {
            if (this.intervals[i] !== except) {
                clearInterval(this.intervals[i]);
            }
        }
    }

    preventCtrlMenu() {
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

        let observer3;
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
        } catch (err) { }
        setTimeout(function () {
            observer1.disconnect();
            observer2.disconnect();
            try {
                observer3.disconnect();
            } catch (err) { }
        }, 50);
    }

    createTextBox(oldtextBox = null, txt) {
        if (oldtextBox) {
            oldtextBox.remove();
        }
        const textBox = document.createElement('div');
        textBox.innerText = txt; // 设置文本内容
        // 设置文本框的样式
        textBox.style.position = 'absolute';
        if (this.isFullScreen()) {
            textBox.style.top = '80%'; // 距离视频顶部10px
        } else {
            textBox.style.top = '67%';
        }
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
        this.videoElement.parentElement.style.position = 'relative'; // 确保父元素是相对定位
        this.videoElement.parentElement.appendChild(textBox);
        return textBox;
    }

    fadeoutTextBox(textBox, timeout = 100) {
        // 2秒后将文本框从 DOM 中移除
        setTimeout(function () {
            textBox.remove();
        }, timeout);
    }

    sec2Time(sec) {
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
        } else {
            return `${h}:${m}:${s}`;
        }
    }

    isFullScreen() {
        return document.fullscreenElement != null;
    }

    // 省略其他代码...
}
class AddRightEntryEventListener {
    constructor(rightEntry) {
        this.rightEntry = rightEntry;
        this.rightEntry.addEventListener('click', this.handleRightEntryClick.bind(this));
    }
    handleRightEntryClick(event) {
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
    }
}

function waitForVideoELement(timeout = 5000) {
    return new Promise((resolve, reject) => {
        const intervalID = setInterval(() => {
            let videoElement = document.querySelector("video");

            if (videoElement) {
                clearInterval(intervalID);
                clearTimeout(timeoutID);
                resolve(videoElement);
            }
        }, 100);

        const timeoutID = setTimeout(() => {
            clearInterval(intervalID);
            reject(new Error("Timeout: Video element not found"));
        }, timeout);
    });
}

function waitForRightEntry(timeout = 5000) {
    return new Promise((resolve, reject) => {
        const intervalID = setInterval(() => {
            if (document.querySelector("#nav-searchform") != null) {
                let header_position;
                header_position = document.querySelector("#biliMainHeader > div.bili-header.fixed-header > div > ul.right-entry") || document.querySelector(".right-entry");

                if (header_position) {
                    clearInterval(intervalID);
                    clearTimeout(timeoutID);
                    resolve(header_position);
                }
            }
        }, 100);

        const timeoutID = setTimeout(() => {
            clearInterval(intervalID);
            reject(new Error("Timeout: Right entry element not found"));
        }, timeout);
    });
}

var currenturl = window.location.href.replace(/\/\?p=/g, "?p="); //打开的网页
if (currenturl.includes("https://www.bilibili.com/correspond") || currenturl.includes("https://message.bilibili.com/pages/nav/header_sync")) { //排除两个网站
    return
}

Promise.race([waitForVideoELement(), waitForRightEntry()])
    .then((result) => {
        if (result instanceof HTMLVideoElement) {
            console.log("Video element found!");
            new VideoGestureHandler(result);
            handleAnotherPromise(waitForRightEntry, AddRightEntryEventListener , "right");
        } else if (result instanceof HTMLElement) {
            console.log("Right entry element found!");
            new AddRightEntryEventListener(result);
            handleAnotherPromise(waitForVideoELement, VideoGestureHandler , "video");
        }
    })
    .catch((error) => {
        console.error('Error:', error);
    });


function handleAnotherPromise(promiseFunc, handler , type) {
    promiseFunc()
        .then((result) => {
            new handler(result);
            if(type == "video"){
                console.log("Video element found!");
            }else if(type == "right"){
                console.log("Right entry element found!");
            }
            return
        })
        .catch((error) => {
            console.error('Error:', error);
            return
        });
}
