((instances) => {

    class APlayer {
        /**
         * APlayer constructor function
         *
         * @param {Object} option - See README
         * @constructor
         */
        constructor(option) {

            this.isMobile = navigator.userAgent.match(/(iPad)|(iPhone)|(iPod)|(android)|(webOS)/i);
            // compatibility: some mobile browsers don't suppose autoplay
            if (this.isMobile) {
                option.autoplay = false;
            }

            // default options
            const defaultOption = {
                element: document.getElementsByClassName('aplayer')[0],
                narrow: false,
                autoplay: false,
                mutex: true,
                showlrc: 0,
                theme: '#b7daff',
                loop: true
            };
            for (let defaultKey in defaultOption) {
                if (defaultOption.hasOwnProperty(defaultKey) && !option.hasOwnProperty(defaultKey)) {
                    option[defaultKey] = defaultOption[defaultKey];
                }
            }

            // multiple music
            this.playIndex = Object.prototype.toString.call(option.music) === '[object Array]' ? 0 : -1;

            this.option = option;
            this.audios = [];
            this.loop = option.loop;

            /**
             * Parse second to 00:00 format
             *
             * @param {Number} second
             * @return {String} 00:00 format
             */
            this.secondToTime = (second) => {
                const add0 = (num) => {
                    return num < 10 ? '0' + num : '' + num;
                };
                const min = parseInt(second / 60);
                const sec = parseInt(second - min * 60);
                return add0(min) + ':' + add0(sec);
            };

            /**
             * Parse lrc, suppose multiple time tag
             *
             * @param {Array} arr - Format:
             * [mm:ss.xx]lyric
             * [mm:ss.xxx]lyric
             * [mm:ss.xx][mm:ss.xx][mm:ss.xx]lyric
             *
             * @return {Array} [[[time, text], [time, text], [time, text], ...], [[time, text], [time, text], [time, text], ...], ...]
             */
            this.parseLrc = (arr) => {
                let lrcs = [];
                for (let k = 0; k < arr.length; k++) {
                    const lyric = arr[k].split('\n');
                    let lrc = [];
                    const lyricLen = lyric.length;
                    for (let i = 0; i < lyricLen; i++) {
                        // match lrc time
                        const lrcTimes = lyric[i].match(/\[(\d{2}):(\d{2})\.(\d{2,3})]/g);
                        // match lrc text
                        const lrcText = lyric[i].replace(/\[(\d{2}):(\d{2})\.(\d{2,3})]/g, '').replace(/^\s+|\s+$/g, '');

                        if (lrcTimes != null) {
                            // handle multiple time tag
                            const timeLen = lrcTimes.length;
                            for (let j = 0; j < timeLen; j++) {
                                const oneTime = /\[(\d{2}):(\d{2})\.(\d{2,3})]/.exec(lrcTimes[j]);
                                const lrcTime = (oneTime[1]) * 60 + parseInt(oneTime[2]) + parseInt(oneTime[3]) / ((oneTime[3] + '').length === 2 ? 100 : 1000);
                                lrc.push([lrcTime, lrcText]);
                            }
                        }
                    }
                    // sort by time
                    lrc.sort((a, b) => a[0] - b[0]);
                    lrcs.push(lrc);
                }
                return lrcs;
            };

            /**
             * Update progress bar, including loading progress bar and play progress bar
             *
             * @param {String} type - Point out which bar it is, should be played loaded or volume
             * @param {Number} percentage
             * @param {String} direction - Point out the direction of this bar, Should be height or width
             */
            this.updateBar = (type, percentage, direction) => {
                percentage = percentage > 0 ? percentage : 0;
                percentage = percentage < 1 ? percentage : 1;
                this[type + 'Bar'].style[direction] = percentage * 100 + '%';
            };

            /**
             * Update lrc
             *
             * @param {Number} currentTime
             */
            this.updateLrc = (currentTime = this.audio.currentTime) => {
                if (this.lrcIndex > this.lrc.length - 1 || currentTime < this.lrc[this.lrcIndex][0] || (!this.lrc[this.lrcIndex + 1] || currentTime >= this.lrc[this.lrcIndex + 1][0])) {
                    for (let i = 0; i < this.lrc.length; i++) {
                        if (currentTime >= this.lrc[i][0] && (!this.lrc[i + 1] || currentTime < this.lrc[i + 1][0])) {
                            this.lrcIndex = i;
                            this.lrcContents.style.transform = `translateY(${-this.lrcIndex * 20}px)`;
                            this.lrcContents.style.webkitTransform = `translateY(${-this.lrcIndex * 20}px)`;
                            this.lrcContents.getElementsByClassName('aplayer__lrc--current')[0].classList.remove('aplayer__lrc--current');
                            this.lrcContents.getElementsByTagName('p')[i].classList.add('aplayer__lrc--current');
                        }
                    }
                }
            };

            // define APlayer events
            this.eventTypes = ['play', 'pause', 'canplay', 'playing', 'ended', 'error'];
            this.event = {};
            for (let i = 0; i < this.eventTypes.length; i++) {
                this.event[this.eventTypes[i]] = [];
            }
            this.trigger = (type) => {
                for (let i = 0; i < this.event[type].length; i++) {
                    this.event[type][i]();
                }
            }
        }

        /**
         * AutoLink initialization function
         */
        init() {
            this.element = this.option.element;
            this.multiple = this.playIndex > -1;
            this.music = this.multiple ? this.option.music[this.playIndex] : this.option.music;

            let i;
            // parser lrc
            if (this.option.showlrc) {
                let lrcs = [];
                if (this.option.showlrc === 1) {
                    if (this.multiple) {
                        for (i = 0; i < this.option.music.length; i++) {
                            lrcs.push(this.option.music[i].lrc);
                        }
                    }
                    else {
                        lrcs.push(this.option.music.lrc);
                    }
                }
                else if (this.option.showlrc === 2 || this.option.showlrc === true)  {
                    for (i = 0; i < this.element.getElementsByClassName('aplayer__lrc--content').length; i++) {
                        lrcs.push(this.element.getElementsByClassName('aplayer__lrc--content')[i].innerHTML);
                    }
                }

                this.lrcs = this.parseLrc(lrcs);
            }

            // add class aplayer-withlrc
            if (this.option.showlrc) {
                this.element.classList.add('aplayer--withlrc');
            }

            // fill in HTML
            let eleHTML = `
                <div class="aplayer__pic" ${(this.music.pic ? (`style="background-image: url(${encodeURI(this.music.pic)});"`) : ``)}>
                    <div class="aplayer__button aplayer__button--play">
                        <i class="demo-icon aplayer__icon--play"></i>
                    </div>
                </div>
                <div class="aplayer__info">
                    <div class="aplayer__infowrap">
                        <span class="aplayer__title"></span>
                        <span class="aplayer__author"></span>
                    </div>
                    <div class="aplayer__lrcwrap">
                        <div class="aplayer__lrc" style="transform: translateY(0); -webkit-transform: translateY(0);"></div>
                    </div>
                    <div class="aplayer__controller">
                        <div class="aplayer__barwrap">
                            <div class="aplayer__bar">
                                <div class="aplayer__loaded" style="width: 0"></div>
                                <div class="aplayer__played" style="width: 0; background: ${this.option.theme};">
                                    <span class="aplayer__thumb" style="border: 1px solid ${this.option.theme};"></span>
                                </div>
                            </div>
                        </div>
                        <div class="aplayer__controls">
                             - <span class="aplayer__ptime">00:00</span> / <span class="aplayer__dtime">00:00</span>
                            <div class="aplayer__volumewrap">
                                <i class="demo-icon aplayer__icon--volumedown"></i>
                                <div class="aplayer__volumebarwrap">
                                    <div class="aplayer__volumebar">
                                        <div class="aplayer__volumebarinner" style="height: 80%; background: ${this.option.theme};"></div>
                                    </div>
                                </div>
                            </div>
                            <i class="demo-icon aplayer__icon--loop${(this.loop ? `` : ` aplayer__icon--noloop`)}"></i>${(this.multiple ? `<i class="demo-icon aplayer__icon--menu"></i>` : ``)}
                        </div>
                    </div>
                </div>`;
            if (this.multiple) {
                eleHTML += `
                <div class="aplayerlist">
                    <ol>`;
                for (i = 0; i < this.option.music.length; i++) {
                    eleHTML += `
                        <li>
                            <span class="aplayerlist__cur"></span>
                            <span class="aplayerlist__index">${(i + 1)}</span>
                            <span class="aplayerlist__title">${this.option.music[i].title}</span>
                            <span class="aplayerlist__heart"><i class="fa fa-heart-o" aria-hidden="true"></i></span>
                            <span class="aplayerlist__author">${this.option.music[i].author}</span>
                        </li>`
                }
                eleHTML += `
                    </ol>
                </div>`
            }
            this.element.innerHTML = eleHTML;

            this.ptime = this.element.getElementsByClassName('aplayer__ptime')[0];

            if (this.element.getElementsByClassName('aplayer__info')[0].offsetWidth < 200) {
                this.element.getElementsByClassName('aplayer__controls')[0].classList.add('aplayer__controls--narrow');
            }
            // fix the width of aplayer bar
            this.element.getElementsByClassName('aplayer__barwrap')[0].style.marginRight = this.element.getElementsByClassName('aplayer__controls')[0].offsetWidth + 5 + 'px';

            // switch to narrow style
            if (this.option.narrow) {
                this.element.classList.add('aplayer--narrow');
            }

            // play and pause button
            this.button = this.element.getElementsByClassName('aplayer__button')[0];
            this.button.addEventListener('click', (e) => {
                if (this.button.classList.contains('aplayer__button--play')) {
                    this.play();
                }
                else if (this.button.classList.contains('aplayer__button--pause')) {
                    this.pause();
                }
            });

            // click music list: change music
            if (this.multiple) {
                const listItem = this.element.getElementsByClassName('aplayerlist')[0].getElementsByTagName('li');
                for (let i = 0; i < this.option.music.length; i++) {
                    listItem[i].addEventListener('click', () => {
                        const musicIndex = parseInt(listItem[i].getElementsByClassName('aplayerlist__index')[0].innerHTML) - 1;
                        if (musicIndex !== this.playIndex) {
                            this.setMusic(musicIndex);
                        }
                        if (this.isMobile) {
                            this.pause();
                        }
                        else {
                            this.play();
                        }
                    });
                }
            }

            // control play progress
            this.playedBar = this.element.getElementsByClassName('aplayer__played')[0];
            this.loadedBar = this.element.getElementsByClassName('aplayer__loaded')[0];
            this.thumb = this.element.getElementsByClassName('aplayer__thumb')[0];
            this.bar = this.element.getElementsByClassName('aplayer__bar')[0];
            let barWidth;
            this.bar.addEventListener('click', (event) => {
                const e = event || window.event;
                barWidth = this.bar.clientWidth;
                const percentage = (e.clientX - getElementViewLeft(this.bar)) / barWidth;
                this.updateBar('played', percentage, 'width');
                this.element.getElementsByClassName('aplayer__ptime')[0].innerHTML = this.secondToTime(percentage * this.audio.duration);
                this.audio.currentTime = parseFloat(this.playedBar.style.width) / 100 * this.audio.duration;
            });

            this.thumb.addEventListener('mouseover', () => {
                this.thumb.style.background = this.option.theme;
            });
            this.thumb.addEventListener('mouseout', () => {
                this.thumb.style.background = '#fff';
            });

            const thumbMove = (event) => {
                const e = event || window.event;
                let percentage = (e.clientX - getElementViewLeft(this.bar)) / barWidth;
                percentage = percentage > 0 ? percentage : 0;
                percentage = percentage < 1 ? percentage : 1;
                this.updateBar('played', percentage, 'width');
                if (this.option.showlrc) {
                    this.updateLrc(parseFloat(this.playedBar.style.width) / 100 * this.audio.duration);
                }
                this.element.getElementsByClassName('aplayer__ptime')[0].innerHTML = this.secondToTime(percentage * this.audio.duration);
            };

            const thumbUp = () => {
                document.removeEventListener('mouseup', thumbUp);
                document.removeEventListener('mousemove', thumbMove);
                this.audio.currentTime = parseFloat(this.playedBar.style.width) / 100 * this.audio.duration;
                this.playedTime = setInterval(() => {
                    this.updateBar('played', this.audio.currentTime / this.audio.duration, 'width');
                    if (this.option.showlrc) {
                        this.updateLrc();
                    }
                    this.element.getElementsByClassName('aplayer__ptime')[0].innerHTML = this.secondToTime(this.audio.currentTime);
                    this.trigger('playing');
                }, 100);
            };

            this.thumb.addEventListener('mousedown', () => {
                barWidth = this.bar.clientWidth;
                clearInterval(this.playedTime);
                document.addEventListener('mousemove', thumbMove);
                document.addEventListener('mouseup', thumbUp);
            });

            // control volume
            this.volumeBar = this.element.getElementsByClassName('aplayer__volumebarinner')[0];
            const volumeBarWrap = this.element.getElementsByClassName('aplayer__volumebar')[0];
            const volumeicon = this.element.getElementsByClassName('aplayer__controls')[0].getElementsByTagName('i')[0];
            const barHeight = 35;
            this.element.getElementsByClassName('aplayer__volumebarwrap')[0].addEventListener('click', (event) => {
                const e = event || window.event;
                let percentage = (barHeight - e.clientY + getElementViewTop(volumeBarWrap)) / barHeight;
                percentage = percentage > 0 ? percentage : 0;
                percentage = percentage < 1 ? percentage : 1;
                this.updateBar('volume', percentage, 'height');
                this.audio.volume = percentage;
                if (this.audio.muted) {
                    this.audio.muted = false;
                }
                if (percentage === 1) {
                    volumeicon.className = 'demo-icon aplayer__icon--volumeup';
                }
                else {
                    volumeicon.className = 'demo-icon aplayer__icon--volumedown';
                }
            });
            volumeicon.addEventListener('click', () => {
                if (this.audio.muted) {
                    this.audio.muted = false;
                    volumeicon.className = this.audio.volume === 1 ? 'demo-icon aplayer__icon--volumeup' : 'demo-icon aplayer__icon--volumedown';
                    this.updateBar('volume', this.audio.volume, 'height');
                }
                else {
                    this.audio.muted = true;
                    volumeicon.className = 'demo-icon aplayer__icon--volumeoff';
                    this.updateBar('volume', 0, 'height');
                }
            });

            // get element's view position
            function getElementViewLeft(element) {
                let actualLeft = element.offsetLeft;
                let current = element.offsetParent;
                let elementScrollLeft;
                while (current !== null) {
                    actualLeft += current.offsetLeft;
                    current = current.offsetParent;
                }
                elementScrollLeft = document.body.scrollLeft + document.documentElement.scrollLeft;
                return actualLeft - elementScrollLeft;
            }

            function getElementViewTop(element) {
                let actualTop = element.offsetTop;
                let current = element.offsetParent;
                let elementScrollTop;
                while (current !== null) {
                    actualTop += current.offsetTop;
                    current = current.offsetParent;
                }
                elementScrollTop = document.body.scrollTop + document.documentElement.scrollTop;
                return actualTop - elementScrollTop;
            }

            // loop control
            const loopEle = this.element.getElementsByClassName('aplayer__icon--loop')[0];
            loopEle.addEventListener('click', () => {
                if (this.loop) {
                    loopEle.classList.add('aplayer__icon--noloop');
                    this.loop = false;
                    this.audio.loop = this.multiple ? false : this.loop;
                }
                else {
                    loopEle.classList.remove('aplayer__icon--noloop');
                    this.loop = true;
                    this.audio.loop = this.multiple ? false : this.loop;
                }
            });

            // toggle menu control
            if (this.multiple) {
                this.element.getElementsByClassName('aplayer__icon--menu')[0].addEventListener('click', () => {
                    const list = this.element.getElementsByClassName('aplayerlist')[0];
                    if (!list.classList.contains('aplayerlist--hide')) {
                        list.classList.add('aplayerlist--hide');
                    }
                    else {
                        list.classList.remove('aplayerlist--hide');
                    }
                });
            }

            this.setMusic(0);

            instances.push(this);
        }

        /**
         * Set music
         */
        setMusic(index) {
            // get this.music
            if (this.multiple && typeof(index) !== 'undefined') {
                this.playIndex = index;
            }
            const indexMusic = this.playIndex;
            this.music = this.multiple ? this.option.music[indexMusic] : this.option.music;

            // set html
            if (this.music.pic) {
                this.element.getElementsByClassName('aplayer__pic')[0].style.backgroundImage = `url(${encodeURI(this.music.pic)})`;
            }
            this.element.getElementsByClassName('aplayer__title')[0].innerHTML = this.music.title;
            this.element.getElementsByClassName('aplayer__author')[0].innerHTML = ` - ${this.music.author}`;
            if (this.multiple) {
                if (this.element.getElementsByClassName('aplayerlist--light')[0]) {
                    this.element.getElementsByClassName('aplayerlist--light')[0].classList.remove('aplayerlist--light');
                }
                this.element.getElementsByClassName('aplayerlist')[0].getElementsByTagName('li')[indexMusic].classList.add('aplayerlist--light');
            }

            // set the previous audio object
            if (this.audio) {
                this.pause();
                this.audio.currentTime = 0;
            }

            // get this audio object
            if ((this.multiple && !this.audios[indexMusic]) || this.playIndex === -1) {
                this.audio = document.createElement("audio");
                this.audio.src = this.music.url;
                if (this.option.preload) {
                    this.audio.preload = this.option.preload;
                }
                else {
                    this.audio.preload = this.isMobile ? 'none' : 'metadata';
                }

                // show audio time: the metadata has loaded or changed
                this.audio.addEventListener('durationchange', () => {
                    if (this.audio.duration !== 1) {           // compatibility: Android browsers will output 1 at first
                        this.element.getElementsByClassName('aplayer__dtime')[0].innerHTML = this.secondToTime(this.audio.duration);
                    }
                });

                // show audio loaded bar: to inform interested parties of progress downloading the media
                this.audio.addEventListener('progress', () => {
                    const percentage = this.audio.buffered.length ? this.audio.buffered.end(this.audio.buffered.length - 1) / this.audio.duration : 0;
                    this.updateBar('loaded', percentage, 'width');
                });

                // audio download error: an error occurs
                this.audio.addEventListener('error', () => {
                    this.element.getElementsByClassName('aplayer__author')[0].innerHTML = ` - Error happens ╥﹏╥`;
                    this.trigger('pause');
                });

                // audio can play: enough data is available that the media can be played
                this.audio.addEventListener('canplay', () => {
                    this.trigger('canplay');
                });

                // multiple music play
                this.ended = false;
                if (this.multiple) {
                    this.audio.addEventListener('ended', () => {
                        if (this.isMobile) {
                            this.ended = true;
                            this.pause();
                            return;
                        }
                        if (this.audio.currentTime !== 0) {
                            if (this.playIndex < this.option.music.length - 1) {
                                this.setMusic(++this.playIndex);
                            }
                            else if (this.loop) {
                                this.setMusic(0);
                            }
                            else if (!this.loop) {
                                this.ended = true;
                                this.pause();
                                this.trigger('ended');
                            }
                        }
                    });
                }
                else {
                    this.audio.addEventListener('ended', () => {
                        if (!this.loop) {
                            this.ended = true;
                            this.pause();
                            this.trigger('ended');
                        }
                    });
                }

                // control volume
                this.audio.volume = parseInt(this.element.getElementsByClassName('aplayer__volumebarinner')[0].style.height) / 100;

                // loop
                this.audio.loop = this.multiple ? false : this.loop;

                if (this.multiple) {
                    this.audios[indexMusic] = this.audio;
                }
            }
            else {
                this.audio = this.audios[indexMusic];
                this.audio.volume = parseInt(this.element.getElementsByClassName('aplayer__volumebarinner')[0].style.height) / 100;
                this.audio.currentTime = 0;
            }

            // fill in lrc
            if (this.option.showlrc) {
                this.lrc = this.multiple ? this.lrcs[indexMusic] : this.lrcs[0];
                let lrcHTML = '';
                this.lrcContents = this.element.getElementsByClassName('aplayer__lrc')[0];
                for (let i = 0; i < this.lrc.length; i++) {
                    lrcHTML += `<p>${this.lrc[i][1]}</p>`;
                }
                this.lrcContents.innerHTML = lrcHTML;
                if (!this.lrcIndex) {
                    this.lrcIndex = 0;
                }
                this.lrcContents.getElementsByTagName('p')[0].classList.add('aplayer__lrc--current');
                this.lrcContents.style.transform = 'translateY(0px)';
                this.lrcContents.style.webkitTransform = 'translateY(0px)';
            }

            // set duration time
            if (this.audio.duration !== 1) {           // compatibility: Android browsers will output 1 at first
                this.element.getElementsByClassName('aplayer__dtime')[0].innerHTML = this.audio.duration ? this.secondToTime(this.audio.duration) : '00:00';
            }

            // autoplay
            if (this.option.autoplay && !this.isMobile) {
                this.play();
            }
            this.option.autoplay = true;  // autoplay next music

            if (this.isMobile) {
                this.pause();
            }
        }

        /**
         * Play music
         */
        play() {
            if (this.audio.paused) {
                this.button.classList.remove('aplayer__button--play');
                this.button.classList.add('aplayer__button--pause');
                this.button.innerHTML = '';
                setTimeout(() => {
                    this.button.innerHTML = '<i class="demo-icon aplayer__icon--pause"></i>';
                }, 100);

                // pause other players (Thanks @Aprikyblue)
                if (this.option.mutex) {
                    for (let i = 0; i < instances.length; i++) {
                        if (this != instances[i]) {
                            instances[i].pause();
                        }
                    }
                }
                this.audio.play();
                if (this.playedTime) {
                    clearInterval(this.playedTime);
                }
                this.playedTime = setInterval(() => {
                    this.updateBar('played', this.audio.currentTime / this.audio.duration, 'width');
                    if (this.option.showlrc) {
                        this.updateLrc();
                    }
                    this.ptime.innerHTML = this.secondToTime(this.audio.currentTime);
                    this.trigger('playing');
                }, 100);
                this.trigger('play');
            }
        }

        /**
         * Pause music
         */
        pause() {
            if (!this.audio.paused || this.ended) {
                this.ended = false;
                this.button.classList.remove('aplayer__button--pause');
                this.button.classList.add('aplayer__button--play');
                this.button.innerHTML = '';
                setTimeout(() => {
                    this.button.innerHTML = '<i class="demo-icon aplayer__icon--play"></i>';
                }, 100);
                this.audio.pause();
                clearInterval(this.playedTime);
                this.trigger('pause');
            }
        }

        /**
         * attach event
         */
        on(name, func) {
            if (typeof func === 'function') {
                this.event[name].push(func);
            }
        }
    }

    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = APlayer;
    }
    else {
        window.APlayer = APlayer;
    }
})([]);
