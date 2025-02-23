let scrolldelay;

let animation_timeout_id = '';

let search_song;
let get_songs_timeout;

let beats_per_minute = 160;
let beats_per_measure = 4;
let count = 0;
let is_playing = 0;

let learning_status_timeout = '';
let hand_colorList = '';

let uploadProgress = [];

let advancedMode = false;

let gradients;
let config_settings;
let live_settings;

const tick1 = new Audio('/static/tick2.mp3');
tick1.volume = 0.2;
const tick2 = new Audio('/static/tick1.mp3');
tick2.volume = 0.2;

function play_tick_sound() {
    if (count >= beats_per_measure) {
        count = 0;
    }
    if (count === 0) {
        tick1.play();
        tick1.currentTime = 0;
    } else {
        tick2.play();
        tick2.currentTime = 0;
    }

    count++;
}

function change_bpm(bpm) {
    beats_per_minute = bpm;
    ticker.interval = 60000 / bpm;
}

function change_volume(value) {
    if (parseInt(value) < -10 || parseInt(value) > 110) {
        return false;
    }
    value = (parseFloat(value) / 100);
    tick1.volume = value;
    tick2.volume = value;
}

function change_beats_per_measure(value) {
    if (parseInt(value) <= 2) {
        return false;
    }
    beats_per_measure = parseInt(value);
}

let ticker = new AdjustingInterval(play_tick_sound, 60000 / beats_per_minute);


function loadAjax(subpage) {
    if (!subpage || subpage === "/") {
        subpage = "home"
    }
    document.getElementById("main").classList.remove("show");
    setTimeout(function () {
        document.getElementById("main").innerHTML = "";
    }, 100);

    if (document.getElementById("midi_player")) {
        document.getElementById('midi_player').stop()
    }

    setTimeout(function () {
        const xhttp = new XMLHttpRequest();
        xhttp.timeout = 5000;
        xhttp.onreadystatechange = function () {
            if (this.readyState === 4 && this.status === 200) {
                document.getElementById("main").innerHTML = this.responseText;
                setTimeout(function () {
                    document.getElementById("main").classList.add("show");
                }, 100);
                remove_page_indicators()
                document.getElementById(subpage).classList.add("dark:bg-gray-700", "bg-gray-100");
                if (subpage === "home") {
                    initialize_homepage();
                    get_homepage_data_loop();
                    get_settings(false);
                }
                if (subpage === "ledsettings") {
                    populate_colormaps(["velocityrainbow_colormap"]);
                    initialize_led_settings();
                    get_current_sequence_setting();
                    clearInterval(homepage_interval);
                    setAdvancedMode(advancedMode);
                }
                if (subpage === "ledanimations") {
                    get_led_idle_animation_settings();
                    clearInterval(homepage_interval);
                    populate_colormaps(["colormap_anim_id"]);
                }
                if (subpage === "songs") {
                    initialize_songs();
                    clearInterval(homepage_interval);
                }
                if (subpage === "sequences") {
                    initialize_sequences();
                    initialize_led_settings();
                    clearInterval(homepage_interval);
                }
                if (subpage === "ports") {
                    clearInterval(homepage_interval);
                    initialize_ports_settings();
                }
                if (subpage === "settings") {
                    clearInterval(homepage_interval);
                }
                if (subpage === "network") {
                    clearInterval(homepage_interval);
                    get_wifi_list();
                }
            }

            translateStaticContent();
        };
        xhttp.ontimeout = function () {
            document.getElementById("main").innerHTML = "REQUEST TIMEOUT";
        };
        xhttp.onerror = function () {
            document.getElementById("main").innerHTML = "REQUEST FAILED";
        };
        xhttp.open("GET", "/" + subpage, true);
        xhttp.send();
    }, 100);
}

get_colormap_gradients();
loadAjax(window.location.hash.substring(1));

function remove_page_indicators() {
    document.getElementById("home").classList.remove("dark:bg-gray-700", "bg-gray-100");
    document.getElementById("ledsettings").classList.remove("dark:bg-gray-700", "bg-gray-100");
    document.getElementById("songs").classList.remove("dark:bg-gray-700", "bg-gray-100");
    document.getElementById("sequences").classList.remove("dark:bg-gray-700", "bg-gray-100");
    document.getElementById("ports").classList.remove("dark:bg-gray-700", "bg-gray-100");
    document.getElementById("ledanimations").classList.remove("dark:bg-gray-700", "bg-gray-100");
    document.getElementById("network").classList.remove("dark:bg-gray-700", "bg-gray-100");
}

function get_homepage_data_loop() {
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            let refresh_rate = getCookie("refresh_rate");
            if (refresh_rate == 0) {
                refresh_rate = 1
            }
            const response_pc_stats = JSON.parse(this.responseText);

            let download = (response_pc_stats.download - download_start) / refresh_rate;
            let upload = (response_pc_stats.upload - upload_start) / refresh_rate;
            if (download_start === 0) {
                download = 0;
                upload = 0;
            }
            animateValue(document.getElementById("cpu_number"), last_cpu_usage,
                response_pc_stats["cpu_usage"], refresh_rate * 500, false);
            document.getElementById("memory_usage_percent").innerHTML = response_pc_stats["memory_usage_percent"] + "%";
            document.getElementById("memory_usage").innerHTML =

                formatBytes(response_pc_stats["memory_usage_used"], 2, false) + "/" +
                formatBytes(response_pc_stats["memory_usage_total"]);
            document.getElementById("cpu_temp").innerHTML = response_pc_stats["cpu_temp"];

            document.getElementById("card_usage").innerHTML =
                formatBytes(response_pc_stats["card_space_used"], 2, false) + "/" +
                formatBytes(response_pc_stats["card_space_total"]);
            document.getElementById("card_usage_percent").innerHTML = response_pc_stats["card_space_percent"] + "%";
            animateValue(document.getElementById("download_number"), last_download, download, refresh_rate * 500, true);
            animateValue(document.getElementById("upload_number"), last_upload, upload, refresh_rate * 500, true);

            document.getElementById("cover_state").innerHTML = response_pc_stats["cover_state"];

            document.getElementById("led_fps").innerHTML = response_pc_stats.led_fps;
            document.getElementById("cpu_count").innerHTML = response_pc_stats.cpu_count;
            document.getElementById("cpu_pid").innerHTML = response_pc_stats.cpu_pid;
            document.getElementById("cpu_freq").innerHTML = response_pc_stats.cpu_freq;
            document.getElementById("memory_pid").innerHTML =
                formatBytes(response_pc_stats.memory_pid, 2, false);

            document.getElementById("cover_state").innerHTML = response_pc_stats.cover_state;

            // change value of select based on response_pc_stats.screen_on
            document.getElementById("screen_on").value = response_pc_stats.screen_on;
            document.getElementById("reinitialize_network_on_boot").value = response_pc_stats.reinitialize_network_on_boot;

            document.getElementById("cover_state").innerHTML = response_pc_stats.cover_state;


            download_start = response_pc_stats.download;
            upload_start = response_pc_stats.upload;

            last_cpu_usage = response_pc_stats["cpu_usage"];
            last_download = download;
            last_upload = upload;

            checkSavedMode();
        }
    };
    xhttp.open("GET", "/api/get_homepage_data", true);
    xhttp.send();
}

function get_colormap_gradients() {
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            gradients = JSON.parse(this.responseText);
        }
    };
    xhttp.open("GET", "/api/get_colormap_gradients", true);
    xhttp.send();
}

function populate_colormaps(select_ids) {
    if (!gradients)
        return;

    for (const id of select_ids) {
        const select = document.getElementById(id);
        var options = [];
        for (const key in gradients)
            options.push(new Option(key, key));
        const value = select.value;
        select.replaceChildren(...options);
        select.value = value;
    }
}

function start_led_animation(name, speed) {
    const xhttp = new XMLHttpRequest();
    xhttp.open("GET", "/api/start_animation?name=" + name + "&speed=" + speed, true);
    xhttp.send();
}

function change_setting(setting_name, value, second_value = false, disable_sequence = false) {
    const xhttp = new XMLHttpRequest();
    try {
        value = value.replaceAll('#', '');
    } catch {
    }
    xhttp.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            response = JSON.parse(this.responseText);
            if (response.reload == true) {
                get_settings();
                get_current_sequence_setting();
            }
            if (response["reload_ports"] == true) {
                get_ports();
            }
            if (response["reload_songs"] == true) {
                get_recording_status();
                get_songs();
            }
            if (response["reload_sequence"] == true) {
                get_current_sequence_setting();
                get_sequences();
            }
            if (response["reload_steps_list"] == true) {
                document.getElementById("sequence_edit_block").classList.add("animate-pulse", "pointer-events-none")
                get_steps_list();
                setTimeout(function () {
                    document.getElementById("sequence_step").dispatchEvent(new Event('change'));
                    document.getElementById("sequence_edit_block").classList.remove("animate-pulse", "pointer-events-none")
                }, 2000);
            }
            if (response["reload_learning_settings"] == true) {
                get_learning_status();
            }

            // called when adding step
            if (response["set_sequence_step_number"]) {
                document.getElementById("sequence_edit_block").classList.add("animate-pulse", "pointer-events-none")
                let step = response["set_sequence_step_number"] - 1;
                setTimeout(function () {
                    let sequenceStepElement = document.getElementById("sequence_step");
                    sequenceStepElement.value = step;
                    sequenceStepElement.dispatchEvent(new Event('change'));
                    document.getElementById("sequence_edit_block").classList.remove("animate-pulse", "pointer-events-none")
                }, 2000);
            }
        }
    }
    xhttp.open("GET", "/api/change_setting?setting_name=" + setting_name + "&value=" + value
        + "&second_value=" + second_value + "&disable_sequence=" + disable_sequence, true);
    xhttp.send();
}

function switch_ports() {
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            get_ports()
            if (document.getElementById('switch_ports') != null) {
                document.getElementById('switch_ports').disabled = false;
            }
            document.getElementById('switch_ports_sidebar').disabled = false;
        }
    };
    xhttp.open("GET", "/api/switch_ports", true);
    xhttp.send();
}

function disable_wifi_refresh_button() {
    if (document.getElementById('refresh-wifi-button') != null) {
        document.getElementById('refresh-wifi-button').disabled = true;
        document.getElementById('refresh-wifi-button').classList.add("pointer-events-none", "animate-spin");
    }
    if (document.getElementById('wifi-list') != null) {
        document.getElementById('wifi-list').disabled = true;
        document.getElementById('wifi-list').classList.add("pointer-events-none", "opacity-50", "animate-pulse");
    }
}

function enable_wifi_refresh_button() {
    if (document.getElementById('refresh-wifi-button') != null) {
        document.getElementById('refresh-wifi-button').disabled = false;
        document.getElementById('refresh-wifi-button').classList.remove("pointer-events-none", "animate-spin");
    }
    if (document.getElementById('wifi-list') != null) {
        document.getElementById('wifi-list').disabled = false;
        document.getElementById('wifi-list').classList.remove("pointer-events-none", "opacity-50", "animate-pulse");
    }
}

function get_wifi_list() {
    disable_wifi_refresh_button();
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        let response;
        if (this.readyState === 4 && this.status === 200) {
            response = JSON.parse(this.responseText);
            update_wifi_list(response);
        }
    };
    xhttp.open("GET", "/api/get_wifi_list", true);
    xhttp.send();
}

function update_wifi_list(response) {
    const wifiListElement = document.getElementById("wifi-list");
    wifiListElement.innerHTML = '';


    let wifi_list = response["wifi_list"]
    let connected_wifi = response["connected_wifi"]
    let connected_wifi_address = response["connected_wifi_address"]

    document.getElementById("connected-wifi").innerHTML = connected_wifi;
    document.getElementById("connected_wifi_address").innerHTML = "BSSID: " + connected_wifi_address;

    // Loop through wifi_list
    wifi_list.forEach(wifi => {
        const listItem = document.createElement("div");
        listItem.className = "bg-gray-100 dark:bg-gray-600 mb-4 p-2 rounded-md";

        const partial_icon = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" ' +
            'stroke-width="1.5" stroke="currentColor" class="w-6 h-6 absolute">' + getWifiIcon(wifi["Signal Strength"]) + '</svg>';

        const full_wifi_icon = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" ' +
            'stroke-width="1.5" stroke="currentColor" class="w-6 h-6 opacity-30">' +
            '<path d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 ' +
            '8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" /></svg>'

        const wifi_icon = "<div class='relative inline-block'>" + partial_icon + full_wifi_icon + "</div>";

        listItem.innerHTML =
            `<div class="rounded-md flex items-center justify-between">
                ${wifi_icon}
                <div class="block">
                    <div class="ml-4">${wifi["ESSID"]}</div>
                    <div class="ml-4 text-xs text-center opacity-50">${wifi["Address"]}</div>
                </div>
                <button onclick="this.classList.add('hidden');                            
                            document.getElementById('wifi_${wifi["ESSID"]}').classList.remove('hidden');
                            document.getElementById('wifi_password_${wifi["ESSID"]}').focus()"
                    class="w-20 outline-none bg-blue-500 dark:bg-blue-500 py-2 font-bold rounded-2xl" data-translate="connect">
                    ${translate("connect")}
                </button>            
            
            </div>
            <div id="wifi_${wifi["ESSID"]}" class="hidden ">
                <div class="relative">
                    <input id="wifi_password_${wifi["ESSID"]}" class="mt-4 h-10 block a w-full dark:text-black bg-gray-200 dark:bg-gray-700 py-2 px-2 rounded-2xl leading-tight focus:outline-none focus:bg-white focus:border-gray-500" type="password" placeholder="Type Wi-Fi password here">
                    <button class="absolute top-1/4 right-2" onclick="togglePasswordVisibility(this, 'wifi_password_${wifi["ESSID"]}');">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6" id="toggle-eye-${wifi["ESSID"]}">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                    </button>
                </div>
                <div class="text-xs text-red-400">
                <div data-translate="incorrect_password">${translate("incorrect_password")}</div>
                <br>
                <div data-translate="if_the_hotspot">${translate("if_the_hotspot")}</div>
                </div>
                <button onclick="change_setting('connect_to_wifi', '${wifi["ESSID"]}', document.getElementById('wifi_password_${wifi["ESSID"]}').value);
                    temporary_disable_button(this, 5000);"
                    class="m-auto flex mt-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md">
                <span class="w-20" data-translate="connect">${translate("connect")}</span></button>
            </div>
            `;

        wifiListElement.appendChild(listItem);
        if (connected_wifi != "No Wi-Fi interface found.") {
            document.getElementById("disconnect-button").classList.remove("hidden");
            document.getElementById("connected_wifi_address").classList.remove("hidden");
        }

    });
    enable_wifi_refresh_button();
}

function togglePasswordVisibility(button, inputId) {
    const input = document.getElementById(inputId);
    const eyeIcon = button.querySelector('svg');

    if (input.type === 'password') {
        input.type = 'text';
        eyeIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        `;
    } else {
        input.type = 'password';
        eyeIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
        `;
    }
}

function getWifiIcon(signalStrength) {
    // Map the signal strength percentage to icons
    if (signalStrength >= 75) {
        return '<path d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />';
    } else if (signalStrength >= 50) {
        return '<path d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />';
    } else if (signalStrength >= 25) {
        return '<path d="M8.288 15.038a5.25 5.25 0 017.424 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />';
    } else if (signalStrength >= 0) {
        return '<path d="M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />';
    } else {
        return ''; // Empty string for no icon
    }
}


function get_settings(home = true) {
    const xhttp = new XMLHttpRequest();
    xhttp.timeout = 5000;
    xhttp.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            let response = JSON.parse(this.responseText);
            config_settings = response;

            if (home) {

                if (document.getElementById("backlight_color")) {
                    document.getElementById("backlight_color").value = response["backlight_color"];
                    document.getElementById("sides_color").value = response["sides_color"];
                    document.getElementById("sides_color_mode").value = response["sides_color_mode"];

                    if (response["sides_color_mode"] !== "RGB") {
                        document.getElementById('sides_color_choose').hidden = true;
                    }

                    document.getElementById("brightness").value = response["brightness"];
                    document.getElementById("brightness_percent").value = response["brightness"] + "%";
                    document.getElementById("gamma_correction").value = response["led_gamma"];
                    document.getElementById("backlight_brightness").value = response["backlight_brightness"];
                    document.getElementById("backlight_brightness_percent").value = response["backlight_brightness"] + "%";
                    document.getElementById("skipped_notes").value = response["skipped_notes"];
                    document.getElementById("led_count").value = response["led_count"];
                    document.getElementById("leds_per_meter").value = response["leds_per_meter"];
                    document.getElementById("shift").value = response["led_shift"];
                    document.getElementById("reverse").value = response["led_reverse"];
                    document.getElementById("sides_color").dispatchEvent(new Event('input'));
                    document.getElementById("backlight_color").dispatchEvent(new Event('input'));
                }

                document.getElementById("light_mode").value = response["light_mode"];
                if (response["light_mode"] === "Fading") {
                    document.getElementById('fading').hidden = false;
                    document.getElementById('fading_speed').value = response["fading_speed"];
                }
                if (response.light_mode == "Velocity") {
                    document.getElementById('velocity').hidden = false;
                    document.getElementById('velocity_speed').value = response.fading_speed;
                }
                if (response.light_mode == "Pedal") {
                    document.getElementById('velocity').hidden = false;
                    document.getElementById('velocity_speed').value = response.fading_speed;
                }

                document.getElementById("led_color").value = response["led_color"];

                document.getElementById("color_mode").value = response["color_mode"];

                show_multicolors(response["multicolor"], response["multicolor_range"], response["multicolor_iteration"]);

                show_note_offsets(response["note_offsets"]);

                document.getElementById("rainbow_offset").value = response["rainbow_offset"];
                document.getElementById("rainbow_scale").value = response["rainbow_scale"];
                document.getElementById("rainbow_timeshift").value = response.rainbow_timeshift;

                document.getElementById("velocityrainbow_offset").value = response["velocityrainbow_offset"];
                document.getElementById("velocityrainbow_scale").value = response["velocityrainbow_scale"];
                document.getElementById("velocityrainbow_curve").value = response["velocityrainbow_curve"];
                document.getElementById("velocityrainbow_colormap").value = response["velocityrainbow_colormap"];

                document.getElementById("speed_slow_color").value = response["speed_slowest_color"];
                document.getElementById("speed_fast_color").value = response["speed_fastest_color"];

                document.getElementById("speed_max_notes").value = response["speed_max_notes"];
                document.getElementById("speed_period_in_seconds").value = response["speed_period_in_seconds"];

                document.getElementById("gradient_start_color").value = response["gradient_start_color"];
                document.getElementById("gradient_end_color").value = response["gradient_end_color"];

                document.getElementById("key_in_scale_color").value = response["key_in_scale_color"];
                document.getElementById("key_not_in_scale_color").value = response["key_not_in_scale_color"];

                document.getElementById("scale_key").value = response["scale_key"];

                document.getElementById('color_mode').onchange();
            } else {
                document.getElementById("color_mode").innerHTML = response["color_mode"];
                document.getElementById("light_mode").innerHTML = response["light_mode"];
                document.getElementById("brightness_percent").innerHTML = response["brightness"] + "%";
                document.getElementById("backlight_brightness_percent").innerHTML = response["backlight_brightness"] + "%";
                document.getElementById("input_port").innerHTML = response["input_port"];
                document.getElementById("playback_port").innerHTML = response["play_port"];
            }

        }
    };
    xhttp.open("GET", "/api/get_settings", true);
    xhttp.send();
}

function calculate_rainbow(x) {
    let red, green, blue;
    x = x % 255;
    let y = x % 85;
    const t1 = y * 3;
    const t2 = 255 - (y * 3);

    if (x < 85) return rgbToHex(t2, t1, 0);
    else if (x < 170) return rgbToHex(0, t2, t1);
    else return rgbToHex(t1, 0, t2);
}

/**
 * Converts an HSV color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes h, s, and v are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  v       The value
 * @return  Array           The RGB representation
 */
function hsvToRgb(h, s, v) {
    let r, g, b;

    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0:
            r = v, g = t, b = p;
            break;
        case 1:
            r = q, g = v, b = p;
            break;
        case 2:
            r = p, g = v, b = t;
            break;
        case 3:
            r = p, g = q, b = v;
            break;
        case 4:
            r = t, g = p, b = v;
            break;
        case 5:
            r = v, g = p, b = q;
            break;
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function powercurve(x, p) {
    if (p === 0) return x;
    return (Math.exp(-p * x) - 1) / (Math.exp(-p) - 1);
}


function get_led_idle_animation_settings(){
    const xhttp = new XMLHttpRequest();
    xhttp.timeout = 5000;
    xhttp.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            let response = JSON.parse(this.responseText);
            document.getElementById("animation_delay").value = response["led_animation_delay"];
            document.getElementById("led_animation").value = response["led_animation"];
            document.getElementById("brightness_percent").value = response["led_animation_brightness_percent"];
            document.getElementById("brightness").value = response["led_animation_brightness_percent"];
        }
    }
    xhttp.open("GET", "/api/get_idle_animation_settings", true);
    xhttp.send();
}

function get_current_sequence_setting(home = true, is_loading_step = false) {
    let is_editing_sequence = "false"
    const xhttp = new XMLHttpRequest();
    xhttp.timeout = 5000;
    xhttp.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            let response = JSON.parse(this.responseText);
            live_settings = response;

            if (document.getElementById('sequence_edit')) {
                is_editing_sequence = document.getElementById('sequence_edit').getAttribute("active");
            } else {
                is_editing_sequence = "false";
            }

            if (document.getElementById("current_color_mode")) {
                document.getElementById("current_color_mode").innerHTML = response["color_mode"]
                document.getElementById("current_light_mode").innerHTML = response["light_mode"]
            }

            if (is_editing_sequence === "true") {
                document.getElementById('fading').hidden = true;
                document.getElementById('velocity').hidden = true;
                document.getElementById("light_mode").value = response["light_mode"];
                if (response["light_mode"] === "Fading") {
                    document.getElementById('fading').hidden = false;
                    document.getElementById('fading_speed').value = response["fading_speed"];
                }
                if (response["light_mode"] === "Velocity" || response["light_mode"] === "Pedal") {
                    document.getElementById('velocity').hidden = false;
                    document.getElementById('fading_speed').value = response["fading_speed"];
                }
                document.getElementById("color_mode").value = response["color_mode"];
                change_setting("color_mode", response["color_mode"], "no_reload", true);
                change_setting("light_mode", response["light_mode"], false, true);
            }

            if (response["color_mode"] === "Single") {
                document.getElementById("current_led_color").innerHTML = '<svg width="100%" height="45px">' +
                    '<defs>\n' +
                    '   <linearGradient id="gradient_single" x1=".5" y1="1" x2=".5">\n' +
                    '       <stop stop-color="' + response["led_color"] + '" stop-opacity="0"/>\n' +
                    '       <stop offset=".61" stop-color="' + response["led_color"] + '" stop-opacity=".65"/>\n' +
                    '       <stop offset="1" stop-color="' + response["led_color"] + '"/>\n' +
                    '   </linearGradient>\n' +
                    '</defs>' +
                    '<rect width="100%" height="45px" fill="url(#gradient_single)" /></svg>'
                document.getElementById("current_led_color").innerHTML += '<img class="w-full opacity-50" ' +
                    'style="height: 40px;width:100%;margin-top:-40px" src="../static/piano.svg">';

                if (is_editing_sequence === "true") {
                    remove_color_modes();
                    document.getElementById("led_color").value = response["led_color"];
                    document.getElementById('Single').hidden = false;
                    document.getElementById("led_color").dispatchEvent(new Event('input'));

                    change_setting("led_color", response["led_color"], "no_reload", true);
                }

            }
            if (response["color_mode"] === "Multicolor") {

                document.getElementById("current_led_color").innerHTML = '';
                const new_multicolor = {};
                response["multicolor"].forEach(function (item, index) {
                    const multicolor_hex = rgbToHex(item[0], item[1], item[2]);

                    let length = (response.multicolor_range[index][1] - 20) - (response.multicolor_range[index][0] - 20);
                    length = (length / 88) * 100
                    let left_spacing = ((response.multicolor_range[index][0] - 20) / 88) * 100;

                    left_spacing = Math.min(Math.max(parseInt(left_spacing), 0), 88);

                    document.getElementById("current_led_color").innerHTML += '<svg class="mb-2" ' +
                        'style="filter: drop-shadow(0px 5px 15px ' + multicolor_hex + ');margin-left:' + left_spacing + '%" width="100%" height="10px">' +
                        '<rect width="' + length + '%" height="20" fill="' + multicolor_hex + '" /></svg>';

                    if (is_editing_sequence === "true" && is_loading_step === true) {
                        new_multicolor[index] = {};
                        new_multicolor[index]["color"] = multicolor_hex;
                        new_multicolor[index]["range"] = response.multicolor_range[index];
                    }

                });
                document.getElementById("current_led_color").innerHTML += '<img class="w-full opacity-100" ' +
                    'style="height: 40px;width:100%;" src="../static/piano.svg">';

                if (is_editing_sequence === "true" && is_loading_step === true) {
                    remove_color_modes();
                    document.getElementById('Multicolor').hidden = false;
                    show_multicolors(response["multicolor"], response["multicolor_range"], response["multicolor_iteration"]);
                    change_setting("add_multicolor_and_set_value", JSON.stringify(new_multicolor), "", "");
                }


            }
            if (response["color_mode"] === "Gradient") {
                document.getElementById("current_led_color").innerHTML = '<svg ' +
                    'width="100%" height="45px">\n' +
                    '      <defs>\n' +
                    '        <linearGradient id="g1">\n' +
                    '          <stop offset="5%" stop-color="' + response["gradient_end_color"] + '" />\n' +
                    '          <stop offset="95%" stop-color="' + response["gradient_start_color"] + '" />\n' +
                    '        </linearGradient>\n' +
                    '       <linearGradient id="g2" x1=".5" x2=".5" y2="1">\n' +
                    '           <stop stop-color="#000" stop-opacity="0"/>\n' +
                    '           <stop offset=".59" stop-color="#000" stop-opacity=".34217436974789917"/>\n' +
                    '           <stop offset="1" stop-color="#000"/>\n' +
                    '       </linearGradient>' +
                    '      </defs>\n' +
                    '      <rect width="100%" height="45px" fill=\'url(#g1)\'/>' +
                    '      <rect width="100%" height="45px" fill=\'url(#g2)\'/>\n' +
                    '    </svg>'
                document.getElementById("current_led_color").innerHTML += '<img class="w-full opacity-50" ' +
                    'style="height: 40px;width:100%;margin-top:-40px" src="../static/piano.svg">';

                if (is_editing_sequence === "true") {
                    remove_color_modes();
                    document.getElementById('Gradient').hidden = false;
                    document.getElementById("gradient_start_color").value = response["gradient_start_color"];
                    document.getElementById("gradient_end_color").value = response["gradient_end_color"];

                    document.getElementById("gradient_start_color").dispatchEvent(new Event('input'));
                    document.getElementById("gradient_end_color").dispatchEvent(new Event('input'));

                    change_setting("gradient_start_color", response["gradient_start_color"], "no_reload", true);
                    change_setting("gradient_end_color", response["gradient_end_color"], "no_reload", true);
                }
            }

            if (response["color_mode"] === "Speed") {
                document.getElementById("current_led_color").innerHTML = '<svg ' +
                    'width="100%" height="45px">\n' +
                    '      <defs>\n' +
                    '        <linearGradient id="g1">\n' +
                    '          <stop offset="5%" stop-color="' + response["speed_slowest_color"] + '" />\n' +
                    '          <stop offset="95%" stop-color="' + response["speed_fastest_color"] + '" />\n' +
                    '        </linearGradient>\n' +
                    '       <linearGradient id="g2" x1=".5" x2=".5" y2="1">\n' +
                    '           <stop stop-color="#000" stop-opacity="0"/>\n' +
                    '           <stop offset=".59" stop-color="#000" stop-opacity=".34217436974789917"/>\n' +
                    '           <stop offset="1" stop-color="#000"/>\n' +
                    '       </linearGradient>' +
                    '      </defs>\n' +
                    '      <rect width="100%" height="45px" fill=\'url(#g1)\'/>' +
                    '      <rect width="100%" height="45px" fill=\'url(#g2)\'/>\n' +
                    '    </svg>'
                document.getElementById("current_led_color").innerHTML += '<img class="w-full opacity-50" ' +
                    'style="height: 40px;width:100%;margin-top:-40px" src="../static/piano.svg">' +
                    '<div class="flex"><p class="w-full text-xs italic text-gray-600 dark:text-gray-400">slowest</p>' +
                    '<p class="w-full text-xs italic text-right text-gray-600 dark:text-gray-400">fastest</p></div>';

                if (is_editing_sequence === "true") {
                    remove_color_modes();
                    document.getElementById('Speed').hidden = false;
                    document.getElementById("speed_slow_color").value = response["speed_slowest_color"];
                    document.getElementById("speed_fast_color").value = response["speed_fastest_color"];

                    document.getElementById("speed_slow_color").dispatchEvent(new Event('input'));
                    document.getElementById("speed_fast_color").dispatchEvent(new Event('input'));


                    change_setting("speed_slow_color", response["speed_slowest_color"], "no_reload", true);
                    change_setting("speed_fast_color", response["speed_fastest_color"], "no_reload", true);
                }
            }

            if (response["color_mode"] === "Rainbow") {
                offset = response["rainbow_offset"] % 175;
                offset_percent = (offset / 175) * 100;
                offset_percent = -200 - offset_percent;

                if (response.rainbow_timeshift < 0) {
                    response.rainbow_timeshift *= -1;
                    timeshift_speed_in_seconds = 19 * (10 / response.rainbow_timeshift);
                    animation = 'animation: bannermove_right ' + timeshift_speed_in_seconds + 's linear infinite;';
                } else {
                    timeshift_speed_in_seconds = 19 * (10 / response.rainbow_timeshift);
                    animation = 'animation: bannermove_left ' + timeshift_speed_in_seconds + 's linear infinite;';
                }

                //calculating width of gradient box
                box_amount = Math.floor(response["rainbow_scale"] / 150);
                box_remaining = response["rainbow_scale"] % 150;
                box_remaining_percent = (box_remaining / 150) * 100
                if (box_remaining > 0) {
                    if (box_amount > 0) {
                        parts = 100 / box_remaining_percent;
                        total_parts_visible = ((parts * box_amount) + 1);
                        width = (100 / total_parts_visible) * parts;
                    } else {
                        width = (100 / box_remaining_percent) * 100;
                    }
                    box_amount += 1;
                } else {
                    width = 0;
                }

                let rainbow_example = '';
                rainbow_example += '<div class="flex overflow-hidden mt-2">';
                //+4, because there has to be two additional gradient boxes on both sides, so both offset and animation can be applied
                for (i = 0; i < (box_amount + 4); i++) {
                    rainbow_example += '<div class="rainbow-box" style="' + animation + '' +
                        'transform: translateX(' + offset_percent + '%);min-width:' + width + '%;"></div>';
                }
                rainbow_example += '</div>'
                rainbow_example += '<img class="w-full opacity-50" style="height: 40px;width:100%;margin-top:-40px" src="../static/piano.svg">'
                rainbow_example += '<p class="text-xs italic text-right text-gray-600 dark:text-gray-400">*approximate look</p>'
                /*
                rainbow_example += '<label ' +
                    'class="block uppercase tracking-wide text-xs font-bold mt-2 text-gray-600 dark:text-gray-400">Offset</label>' +
                    '<div class="w-full">' + response.rainbow_offset + '</div>'
                rainbow_example += '<label ' +
                    'class="block uppercase tracking-wide text-xs font-bold mt-2 text-gray-600 dark:text-gray-400">Timeshift</label>' +
                    '<div class="w-full">' + response.rainbow_timeshift + '</div>'
                 */
                document.getElementById("current_led_color").innerHTML = rainbow_example;

                if (is_editing_sequence === "true") {
                    document.getElementById("rainbow_offset").value = response["rainbow_offset"];
                    document.getElementById("rainbow_scale").value = response["rainbow_scale"];
                    document.getElementById("rainbow_timeshift").value = response.rainbow_timeshift;

                    remove_color_modes();
                    document.getElementById('Rainbow').hidden = false;

                    change_setting("rainbow_offset", response["rainbow_offset"], "no_reload", true);
                    change_setting("rainbow_scale", response["rainbow_scale"], "no_reload", true);
                    change_setting("rainbow_timeshift", response.rainbow_timeshift, "no_reload", true);
                }
            }

            if (response.color_mode === "VelocityRainbow") {
                const offset = ((~~document.getElementById("velocityrainbow_offset").value % 256) + 256) % 256;
                const scale = ~~document.getElementById("velocityrainbow_scale").value;
                const curve = ~~document.getElementById("velocityrainbow_curve").value;
                const colormap = document.getElementById("velocityrainbow_colormap").value;

                const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
                    const hex = x.toString(16)
                    return hex.length === 1 ? '0' + hex : hex
                }).join('');

                const rgbToHexA = (a) => '#' + [~~a[0], ~~a[1], ~~a[2]].map(x => {
                    const hex = x.toString(16)
                    return hex.length === 1 ? '0' + hex : hex
                }).join('');

                document.getElementById("current_led_color").innerHTML = '<canvas id="VelocityRainbowPreview" style="width: 100%;" height=40px></canvas>';
                const canvas = document.getElementById('VelocityRainbowPreview');
                var width = canvas.clientWidth;
                const ctx = canvas.getContext("2d");
                const grd = ctx.createLinearGradient(0, 0, width, 0);
                const cmap = gradients[colormap] ?? [];
                const stops = cmap.length - 1;
                for (let i = 0; i <= stops; i++) {
                    const vel = ~~(i * 255 / stops);
                    const vel2 = 255 * powercurve(i / stops, curve / 100);
                    const vel3 = (~~(vel2 * scale / 100) % 256 + 256) % 256;
                    const vel4 = (~~(vel3 + offset) % 256 + 256) % 256;

                    grd.addColorStop(i / stops, rgbToHexA(cmap[~~(vel4 * stops / 255)]));
                }
                ctx.fillStyle = grd;
                ctx.fillRect(0, 0, width, 40);


                if (is_editing_sequence === "true") {
                    document.getElementById("velocityrainbow_offset").value = response["velocityrainbow_offset"];
                    document.getElementById("velocityrainbow_scale").value = response["velocityrainbow_scale"];
                    document.getElementById("velocityrainbow_curve").value = response["velocityrainbow_curve"];
                    document.getElementById("velocityrainbow_colormap").value = response["velocityrainbow_colormap"];

                    remove_color_modes();
                    document.getElementById('VelocityRainbow').hidden = false;

                    change_setting("velocityrainbow_offset", response["velocityrainbow_offset"], "no_reload", true);
                    change_setting("velocityrainbow_scale", response["velocityrainbow_scale"], "no_reload", true);
                    change_setting("velocityrainbow_curve", response["velocityrainbow_curve"], "no_reload", true);
                    change_setting("velocityrainbow_colormap", response["velocityrainbow_colormap"], "no_reload", true);
                }
            }

            if (response["color_mode"] === "Scale") {
                //document.getElementById("led_color").innerHTML = response.scale_key
                let scale_key_array = [response["key_in_scale_color"], response["key_not_in_scale_color"]];
                document.getElementById("current_led_color").innerHTML = '<div id="led_color_scale" class="flex"></div>';

                scale_key_array.forEach(function (item, index) {
                    document.getElementById("led_color_scale").innerHTML += '<svg width="100%" height="45px">' +
                        '<defs>\n' +
                        '   <linearGradient id="gradient_single_' + item + '" x1=".5" y1="1" x2=".5">\n' +
                        '       <stop stop-color="' + item + '" stop-opacity="0"/>\n' +
                        '       <stop offset=".61" stop-color="' + item + '" stop-opacity=".65"/>\n' +
                        '       <stop offset="1" stop-color="' + item + '"/>\n' +
                        '   </linearGradient>\n' +
                        '</defs>' +
                        '<rect width="100%" height="45px" fill="url(#gradient_single_' + item + ')" /></svg>';
                });
                document.getElementById("current_led_color").innerHTML += '<img class="w-full opacity-50" ' +
                    'style="height: 40px;width:100%;margin-top:-40px" src="../static/piano.svg">' +
                    '<div class="flex"><p class="w-full text-xs italic text-gray-600 dark:text-gray-400">in a scale</p>' +
                    '<p class="w-full text-xs italic text-right text-gray-600 dark:text-gray-400">not in a scale</p></div>';
                if (is_editing_sequence === "true") {
                    remove_color_modes();
                    document.getElementById('Scale').hidden = false;
                    document.getElementById("key_in_scale_color").value = response["key_in_scale_color"];
                    document.getElementById("key_not_in_scale_color").value = response["key_not_in_scale_color"];
                    document.getElementById("scale_key").value = response["scale_key"];

                    document.getElementById("key_in_scale_color").dispatchEvent(new Event('input'));
                    document.getElementById("key_not_in_scale_color").dispatchEvent(new Event('input'));

                    change_setting("key_in_scale_color", response["key_in_scale_color"], "no_reload", true);
                    change_setting("key_not_in_scale_color", response["key_not_in_scale_color"], "no_reload", true);
                    change_setting("scale_key", response["scale_key"], "no_reload", true);
                }
            }
        }
    };
    xhttp.open("GET", "/api/get_sequence_setting", true);
    xhttp.send();
}


function initialize_homepage() {
    clearInterval(homepage_interval);
    if (getCookie("refresh_rate") != null) {
        refresh_rate = getCookie("refresh_rate");
    } else {
        setCookie("refresh_rate", 3, 365);
    }
    document.getElementById("refresh_rate").value = refresh_rate;
    if (getCookie("refresh_rate") != 0 && refresh_rate != null) {
        homepage_interval = setInterval(get_homepage_data_loop, refresh_rate * 1000)
    }
    if (getCookie("refresh_rate") == 0) {
        setTimeout(get_homepage_data_loop, 1000)
    }
    document.getElementById('refresh_rate').onchange = function () {
        setCookie('refresh_rate', this.value, 365);
        clearInterval(homepage_interval)
        if (this.value !== 0) {
            homepage_interval = setInterval(get_homepage_data_loop, this.value * 1000)
        }
    }
    get_logs();
}

function initialize_led_settings() {
    if (document.getElementById('brightness')) {

        document.getElementById('backlightcolors').addEventListener('change', function (event) {
            change_color_input('backlight_', 'backlight_color', 'backlight_color')
        });

        document.getElementById('sidescolors').addEventListener('change', function (event) {
            change_color_input('sides_', 'sides_color', 'sides_color')
        });

        document.getElementById('brightness').onchange = function () {
            change_setting("brightness", this.value)
        }

        document.getElementById('backlight_brightness').onchange = function () {
            change_setting("backlight_brightness", this.value)
        }

        document.getElementById('skipped_notes').onchange = function () {
            change_setting("skipped_notes", this.value)
        }

        document.getElementById('led_count').onchange = function () {
            change_setting("led_count", this.value)
        }

        document.getElementById('leds_per_meter').onchange = function () {
            change_setting("leds_per_meter", this.value)
        }

        document.getElementById('shift').onchange = function () {
            change_setting("shift", this.value)
        }

        document.getElementById('reverse').onchange = function () {
            change_setting("reverse", this.value)
        }

        document.getElementById('sides_color_mode').onchange = function () {
            change_setting("sides_color_mode", this.value)
            if (this.value === "RGB") {
                document.getElementById('sides_color_choose').hidden = false;
            } else {
                document.getElementById('sides_color_choose').hidden = true;
            }
        }
    }

    document.getElementById('fading_speed').onchange = function () {
        let value = this.value || "10";
        change_setting("fading_speed", value, false, true)
    }

    document.getElementById('velocity_speed').onchange = function () {
        let value = this.value || "8";
        change_setting("velocity_speed", value, false, true)
    }

    document.getElementById('light_mode').onchange = function () {
        if (this.value === "Fading") {
            document.getElementById('fading').hidden = false;
            document.getElementById('fading_speed').onchange();
        } else {
            document.getElementById('fading').hidden = true;
        }
        if (this.value === "Velocity" || this.value === "Pedal") {
            document.getElementById('velocity').hidden = false;
            document.getElementById('velocity_speed').onchange();
        } else {
            document.getElementById('velocity').hidden = true;
        }
        change_setting("light_mode", this.value, false, true)
    }

    document.getElementById('ledcolors').addEventListener('change', function (event) {
        change_color_input('', 'led_color', 'led_color')
    });

    document.getElementById('speedslowcolors').addEventListener('change', function (event) {
        change_color_input('speed_slowest_', 'speed_slow_color', 'speed_slowest_color')
    });

    document.getElementById('speedfastcolors').addEventListener('change', function (event) {
        change_color_input('speed_fastest_', 'speed_fast_color', 'speed_fastest_color')
    });

    document.getElementById('gradientstartcolors').addEventListener('change', function (event) {
        change_color_input('gradient_start_', 'gradient_start_color', 'gradient_start_color')
    });

    document.getElementById('gradientendcolors').addEventListener('change', function (event) {
        change_color_input('gradient_end_', 'gradient_end_color', 'gradient_end_color')
    });

    document.getElementById('keyinscalecolors').addEventListener('change', function (event) {
        change_color_input('key_in_scale_', 'key_in_scale_color', 'key_in_scale_color')
    });

    document.getElementById('keynotinscalecolors').addEventListener('change', function (event) {
        change_color_input('key_not_in_scale_', 'key_not_in_scale_color', 'key_not_in_scale_color')
    });

    document.getElementById('rainbow_offset').onchange = function () {
        change_setting("rainbow_offset", this.value, false, true)
    }

    document.getElementById('rainbow_scale').onchange = function () {
        change_setting("rainbow_scale", this.value, false, true)
    }

    document.getElementById('rainbow_timeshift').onchange = function () {
        change_setting("rainbow_timeshift", this.value, false, true)
    }

    document.getElementById('velocityrainbow_offset').onchange = function () {
        change_setting("velocityrainbow_offset", this.value, false, true)
    }

    document.getElementById('velocityrainbow_scale').onchange = function () {
        change_setting("velocityrainbow_scale", this.value, false, true)
    }

    document.getElementById('velocityrainbow_curve').onchange = function () {
        change_setting("velocityrainbow_curve", this.value, false, true)
    }

    document.getElementById('velocityrainbow_colormap').onchange = function () {
        change_setting("velocityrainbow_colormap", this.value, false, true)
    }

    document.getElementById('color_mode').onchange = function () {
        switch (this.value) {
            case "Single":
                remove_color_modes();
                document.getElementById('Single').hidden = false;
                change_setting("color_mode", "Single", false, true);
                document.getElementById("led_color").dispatchEvent(new Event('input'));
                break;
            case "Multicolor":
                remove_color_modes();
                document.getElementById('Multicolor').hidden = false;
                change_setting("color_mode", "Multicolor", false, true);
                break;
            case "Rainbow":
                remove_color_modes();
                document.getElementById('Rainbow').hidden = false;
                change_setting("color_mode", "Rainbow", false, true);
                break;
            case "VelocityRainbow":
                remove_color_modes();
                document.getElementById('VelocityRainbow').hidden = false;
                change_setting("color_mode", "VelocityRainbow", false, true);
                break;
            case "Speed":
                remove_color_modes();
                document.getElementById('Speed').hidden = false;
                change_setting("color_mode", "Speed", false, true);
                document.getElementById("speed_slow_color").dispatchEvent(new Event('input'));
                document.getElementById("speed_fast_color").dispatchEvent(new Event('input'));
                break;
            case "Gradient":
                remove_color_modes();
                document.getElementById('Gradient').hidden = false;
                change_setting("color_mode", "Gradient", false, true);
                document.getElementById("gradient_start_color").dispatchEvent(new Event('input'));
                document.getElementById("gradient_end_color").dispatchEvent(new Event('input'));
                break;
            case "Scale":
                remove_color_modes();
                document.getElementById('Scale').hidden = false;
                change_setting("color_mode", "Scale", false, true);
                document.getElementById("key_in_scale_color").dispatchEvent(new Event('input'));
                document.getElementById("key_not_in_scale_color").dispatchEvent(new Event('input'));
                break;
            default:

        }
    }
    get_settings();
}

function press_button(element) {
    element.classList.add("pressed");
    setTimeout(function () {
        element.classList.remove("pressed");
    }, 150);
}

function initialize_songs() {
    get_recording_status();
    if (getCookie("sort_by") !== null) {
        document.getElementById("sort_by").value = getCookie("sort_by");
    } else {
        document.getElementById("sort_by").value = "dateAsc";
    }
    get_songs();
    initialize_upload();
    window.addEventListener('resize', function (event) {
        const note_width = document.getElementById('player_and_songs').offsetWidth / 54;
        document.getElementById('myVisualizer').config.whiteNoteWidth = note_width;
    }, true);

    if (is_playing) {
        document.getElementById("metronome_start").classList.add("hidden");
        document.getElementById("metronome_stop").classList.remove("hidden");
    } else {
        document.getElementById("metronome_start").classList.remove("hidden");
        document.getElementById("metronome_stop").classList.add("hidden");
    }
    document.getElementById("beats_per_minute").innerHTML = beats_per_minute;
    document.getElementById("bpm_slider").value = beats_per_minute;

    document.getElementById("beats_per_measure").value = beats_per_measure;
}


function initialize_sequences() {
    clearInterval(homepage_interval);
    document.getElementById('next_step_button').addEventListener("mousedown", function (e) {
        press_button(document.getElementById('next_step_button'));
    });

    window.addEventListener('keydown', function (e) {
        if (e.keyCode === 32 && e.target === document.body) {
            change_setting('next_step', '0');
            press_button(document.getElementById('next_step_button'));
            e.preventDefault();
        }
    });
    get_sequences();
    get_current_sequence_setting();
}

function initialize_ports_settings() {
    get_ports()
    document.getElementById('switch_ports').onclick = function () {
        document.getElementById('switch_ports').disabled = true;
        document.getElementById('switch_ports_sidebar').disabled = true;
        switch_ports()
    }
    document.getElementById('active_input').onchange = function () {
        change_setting("input_port", this.value)
    }
    document.getElementById('secondary_input').onchange = function () {
        change_setting("secondary_input_port", this.value)
    }
    document.getElementById('playback_input').onchange = function () {
        change_setting("play_port", this.value)
    }
}


function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function enforceMinMax(el) {
    if (el.value !== "") {
        if (parseInt(el.value) < parseInt(el.min)) {
            el.value = el.min;
        }
        if (parseInt(el.value) > parseInt(el.max)) {
            el.value = el.max;
        }
    }
}

function get_sequences() {
    if (!document.getElementById('sequences_list_1')) {
        return false;
    }

    const xhttp = new XMLHttpRequest();
    xhttp.timeout = 5000;
    xhttp.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            let sequence_editing_number = document.getElementById('sequences_list_2').value;

            let loop_length = 1;
            if (document.getElementById('sequence_edit').getAttribute("active") === 'true') {
                loop_length = 2;
            }
            for (let s = 1; s <= loop_length; s++) {
                const sequences_list = document.getElementById('sequences_list_' + s);
                let response = JSON.parse(this.responseText);
                removeOptions(document.getElementById('sequences_list_' + s));
                let i = 0;
                response["sequences_list"].unshift("None");
                response["sequences_list"].forEach(function (item, index) {
                    const opt = document.createElement('option');
                    opt.appendChild(document.createTextNode(item));
                    opt.value = i;
                    sequences_list.appendChild(opt);
                    i += 1
                })
                if (s === 1) {
                    sequences_list.value = response["sequence_number"];
                } else {
                    sequences_list.value = sequence_editing_number;
                }

            }
            //get_steps_list();
        }
    };
    xhttp.open("GET", "/api/get_sequences", true);
    xhttp.send();
}

function toggle_edit_sequence() {
    if (document.getElementById('sequence_edit').getAttribute("active") === 'true') {
        document.getElementById('sequence_edit').setAttribute("active", false);
        document.getElementById('sequence_edit_block').classList.add("opacity-50");
        document.getElementById('sequence_edit_block').classList.add("pointer-events-none");
        document.getElementById('sequence_edit').classList.add("animate-pulse");
        document.getElementById('sequence_block').classList.remove("pointer-events-none", "opacity-50");
        document.getElementById('sequences_list_2').value = 0;
    } else {
        document.getElementById('sequence_edit').setAttribute("active", true);
        document.getElementById('sequence_edit_block').classList.remove("opacity-50");
        document.getElementById('sequence_edit_block').classList.remove("pointer-events-none");
        document.getElementById('sequence_edit').classList.remove("animate-pulse");
        document.getElementById('sequence_block').classList.add("pointer-events-none", "opacity-50");
        get_sequences();
    }
}

function get_steps_list() {
    const xhttp = new XMLHttpRequest();
    const sequence_element = document.getElementById('sequences_list_2');
    const sequence = sequence_element.value;

    let current_step = document.getElementById('sequence_step').value;

    document.getElementById('sequence_name').value = sequence_element.options[sequence_element.selectedIndex].text;
    if (sequence === 0) {
        return false;
    }

    xhttp.timeout = 5000;
    xhttp.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            removeOptions(document.getElementById('sequence_step'));
            const sequences_list = document.getElementById('sequence_step');
            let response = JSON.parse(this.responseText);
            let i = 0;
            response["steps_list"].forEach(function (item, index) {
                const opt = document.createElement('option');
                opt.appendChild(document.createTextNode(item.replace('step_', 'Step ')));
                opt.value = i;
                sequences_list.appendChild(opt);
                i += 1
            });
            document.getElementById("control_number").value = response["control_number"];
            document.getElementById("next_step").value = response["next_step"];
            document.getElementById('sequence_step').value = current_step;
            set_step_properties(sequence_element.value,
                document.getElementById('sequence_step').value);

            if (i > 0 && document.getElementById('sequence_step').value == '') {
                document.getElementById('sequence_step').value = 0;
            }
        }
    };
    xhttp.open("GET", "/api/get_steps_list?sequence=" + sequence, true);
    xhttp.send();
}

function set_step_properties(sequence, step) {
    sequence -= 1
    const xhttp = new XMLHttpRequest();
    xhttp.timeout = 5000;
    xhttp.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            get_current_sequence_setting(true, true);
        }
    };
    xhttp.open("GET", "/api/set_step_properties?sequence=" + sequence + "&step=" + step, true);
    xhttp.send();
}

function get_ports() {
    const refresh_ports_button = document.getElementById("refresh-ports");
    refresh_ports_button.classList.add("animate-spin", "pointer-events-none");

    const xhttp = new XMLHttpRequest();
    xhttp.timeout = 5000;
    xhttp.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200 && document.getElementById('active_input') != null) {
            const active_input_select = document.getElementById('active_input');
            const secondary_input_select = document.getElementById('secondary_input');
            const playback_select = document.getElementById('playback_input');
            let response = JSON.parse(this.responseText);
            const length = active_input_select.options.length;
            for (let i = length - 1; i >= 0; i--) {
                active_input_select.options[i] = null;
                secondary_input_select.options[i] = null;
                playback_select.options[i] = null;
            }
            response["ports_list"].forEach(function (item, index) {
                const opt = document.createElement('option');
                const opt2 = document.createElement('option');
                const opt3 = document.createElement('option');
                opt.appendChild(document.createTextNode(item));
                opt2.appendChild(document.createTextNode(item));
                opt3.appendChild(document.createTextNode(item));
                opt.value = item;
                opt2.value = item;
                opt3.value = item;
                active_input_select.appendChild(opt);
                secondary_input_select.appendChild(opt2);
                playback_select.appendChild(opt3);
            });
            active_input_select.value = response["input_port"];
            secondary_input_select.value = response["secondary_input_port"];
            playback_select.value = response["play_port"];
            let connected_ports = response["connected_ports"];
            connected_ports = connected_ports.replaceAll("\\n", "&#10;")
            connected_ports = connected_ports.replaceAll("\\t", "        ")
            connected_ports = connected_ports.replaceAll("b\"", "")
            document.getElementById('connect_all_textarea').innerHTML = connected_ports;
            if (response["midi_logging"] === "1") {
                document.getElementById("midi_events_checkbox").checked = true;
            }
            refresh_ports_button.classList.remove("animate-spin", "pointer-events-none");
        }
    };
    xhttp.onerror = function () {
        refresh_ports_button.classList.remove("animate-spin", "pointer-events-none");
    }
    xhttp.ontimeout = function () {
        refresh_ports_button.classList.remove("animate-spin", "pointer-events-none");
    }
    xhttp.open("GET", "/api/get_ports", true);
    xhttp.send();
}

function get_logs() {
    const refresh_logs_button = document.getElementById("refresh-logs");
    refresh_logs_button.classList.add("animate-spin", "pointer-events-none");

    const xhttp = new XMLHttpRequest();
    xhttp.timeout = 5000;
    xhttp.onreadystatechange = function () {
        if (this["readyState"] === 4 && this["status"] === 200) {
            let response = this["response"];
            let textarea = document.getElementById('logs')
            textarea.innerHTML = response;
            textarea.scrollTop = textarea.scrollHeight;
            refresh_logs_button.classList.remove("animate-spin", "pointer-events-none");
        }
    };
    xhttp.onerror = function () {
        refresh_logs_button.classList.remove("animate-spin", "pointer-events-none");
    }
    xhttp.ontimeout = function () {
        refresh_logs_button.classList.remove("animate-spin", "pointer-events-none");
    }
    let last_logs = document.getElementById("last_logs").value;
    xhttp.open("GET", "/api/get_logs?last_logs=" + last_logs, true);
    xhttp.send();
}

function get_recording_status() {
    const xhttp = new XMLHttpRequest();
    xhttp.timeout = 5000;
    xhttp.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            let response = JSON.parse(this.responseText);
            document.getElementById("input_port").innerHTML = response["input_port"];
            document.getElementById("play_port").innerHTML = response["play_port"];

            if (response["isrecording"]) {
                document.getElementById("recording_status").innerHTML = '<p class="animate-pulse text-red-400">recording</p>';
                document.getElementById("start_recording_button").classList.add('pointer-events-none', 'animate-pulse');
                document.getElementById("save_recording_button").classList.remove('pointer-events-none', 'opacity-50');
                document.getElementById("cancel_recording_button").classList.remove('pointer-events-none', 'opacity-50');
            } else {
                document.getElementById("recording_status").innerHTML = '<p>idle</p>';
                document.getElementById("start_recording_button").classList.remove('pointer-events-none', 'animate-pulse');
                document.getElementById("save_recording_button").classList.add('pointer-events-none', 'opacity-50');
                document.getElementById("cancel_recording_button").classList.add('pointer-events-none', 'opacity-50');
            }
            if (Object.keys(response["isplaying"]).length > 0) {
                document.getElementById("midi_player_wrapper").classList.remove("hidden");
                document.getElementById("start_midi_play").classList.add("hidden");
                document.getElementById("stop_midi_play").classList.remove("hidden");
            }
        }
    };
    xhttp.open("GET", "/api/get_recording_status", true);
    xhttp.send();
}

function get_learning_status(loop_call = false) {
    const xhttp = new XMLHttpRequest();
    const delay_between_requests = 500;
    xhttp.timeout = 5000;
    xhttp.onreadystatechange = function () {
        let response;
        if (this.readyState === 4 && this.status === 200) {
            response = JSON.parse(this.responseText);

            clearTimeout(learning_status_timeout);
            document.getElementById("start_learning").classList.add("pointer-events-none", "opacity-50");
            switch (response.loading) {
                case 0:
                    learning_status_timeout = setTimeout(get_learning_status, delay_between_requests, true);
                    break;
                case 1:
                    learning_status_timeout = setTimeout(get_learning_status, delay_between_requests, true);
                    document.getElementById("start_learning").innerHTML = '<span class="flex uppercase text-xs m-auto ">' +
                        '<div id="learning_status" class="align-middle text-center">Loading...</div></span>';
                    break;
                case 2:
                    learning_status_timeout = setTimeout(get_learning_status, delay_between_requests, true);
                    document.getElementById("start_learning").innerHTML = '<span class="flex uppercase text-xs m-auto ">' +
                        '<div id="learning_status" class="align-middle text-center">Processing...</div></span>';
                    break;
                case 3:
                    learning_status_timeout = setTimeout(get_learning_status, delay_between_requests, true);
                    document.getElementById("start_learning").innerHTML = '<span class="flex uppercase text-xs m-auto ">' +
                        '<div id="learning_status" class="align-middle text-center">Merging...</div></span>';
                    break;
                case 4:
                    document.getElementById("start_learning").classList.remove("pointer-events-none", "opacity-50");
                    document.getElementById("start_learning").innerHTML = '<span class="flex uppercase text-xs m-auto ">' +
                        '<div id="learning_status" class="align-middle text-center">Start learning</div></span>';
                    break;
                case 5:
                    document.getElementById("start_learning").innerHTML = '<span class="flex uppercase text-xs m-auto ">' +
                        '<div id="learning_status" class="align-middle text-center">Error!</div></span>';
                    break;
                default:
                    break;
            }


            if (response.loading === 4 || loop_call === false) {

                document.getElementById("practice").value = response["practice"];
                document.getElementById("tempo_slider").value = response["set_tempo"];
                document.getElementById("hands").value = response["hands"];
                document.getElementById("mute_hand").value = response["mute_hand"];

                document.getElementById("wrong_notes").value = response["show_wrong_notes"];
                document.getElementById("future_notes").value = response["show_future_notes"];

                document.getElementById("start_point").innerHTML = response["start_point"];
                document.getElementById("end_point").innerHTML = response["end_point"];

                hand_colorList = response["hand_colorList"];
                let hand_colorR = response["hand_colorR"];
                let hand_colorL = response["hand_colorL"];

                let hand_colorR_RGB = response.hand_colorList[hand_colorR][0] + ", " + response.hand_colorList[hand_colorR][1] + ", " + response.hand_colorList[hand_colorR][2];
                let hand_colorL_RGB = response.hand_colorList[hand_colorL][0] + ", " + response.hand_colorList[hand_colorL][1] + ", " + response.hand_colorList[hand_colorL][2];

                document.getElementById("hand_colorR").style.fill = 'rgb(' + hand_colorR_RGB + ')';
                document.getElementById("hand_colorL").style.fill = 'rgb(' + hand_colorL_RGB + ')';

                document.getElementById("number_of_mistakes").value = response["number_of_mistakes"];

                if (response["is_loop_active"] === 1) {
                    document.getElementById("is_loop_active").checked = true;
                }

                const min = 0;
                const max = 100;

                const value_left = response["start_point"];
                const value_right = response["end_point"];

                const value_left_percent = (100 / (max - min)) * value_left - (100 / (max - min)) * min;
                const value_right_percent = (100 / (max - min)) * value_right - (100 / (max - min)) * min;

                const value_right_percent_reverse = 100 - value_right_percent;

                document.getElementById("learning_slider_wrapper").innerHTML = '<div slider="" id="slider-distance">\n' +
                    '<div>\n' +
                    '   <div inverse-left="" style="width:' + value_left_percent + '%;"></div>\n' +
                    '   <div inverse-right="" style="width:' + value_right_percent_reverse + '%;"></div>\n' +
                    '   <div range="" style="left:' + value_left_percent + '%;right:' + value_right_percent_reverse + '%;"></div>\n' +
                    '   <span thumb="" style="left:' + value_left_percent + '%;"></span>\n' +
                    '   <span thumb="" style="left:' + value_right_percent + '%;"></span>\n' +
                    '   <div sign="" style="left:' + value_left_percent + '%;">\n' +
                    '       <span id="value1">' + value_left + '</span>\n' +
                    '   </div>\n' +
                    '   <div sign="" style="left:' + value_right_percent + '%;">\n' +
                    '       <span id="value2">' + value_right + '</span>\n' +
                    '   </div>\n' +
                    '</div>\n' +
                    '<input id="learning_start_point" type="range" tabindex="0" value="' + value_left + '" max="100" min="0" step="1"\n' +
                    '   oninput="show_left_slider(this)" onchange="change_setting(\'learning_start_point\', this.value);\n' +
                    '   document.getElementById(\'start_point\').innerHTML = this.value">\n' +
                    '<input id="learning_end_point" type="range" tabindex="0" value="' + value_right + '" max="100" min="0" step="1"\n' +
                    '   oninput="show_right_slider(this)" onchange="change_setting(\'learning_end_point\', this.value);\n' +
                    '   document.getElementById(\'end_point\').innerHTML = this.value">\n' +
                    '</div>';
            }

        }

    };
    xhttp.open("GET", "/api/get_learning_status", true);
    xhttp.send();
}


function get_songs() {
    let page;
    let max_page;
    if (document.getElementById("songs_page")) {
        page = parseInt(document.getElementById("songs_page").value);
        let max_page = parseInt(document.getElementById("songs_page").max);
    } else {
        page = 1;
        max_page = 1;
    }
    if (max_page === 0) {
        max_page = 1;
    }
    if (page > max_page) {
        document.getElementById("songs_page").value = max_page;
        return false;
    }
    if (page < 1) {
        document.getElementById("songs_page").value = 1;
        return false;
    }
    document.getElementById("songs_list_table").classList.add("animate-pulse", "pointer-events-none");

    let sortby = document.getElementById("sort_by").value;
    if (document.getElementById("songs_per_page")) {
        length = document.getElementById("songs_per_page").value;
    } else {
        length = 10;
    }

    let search = document.getElementById("song_search").value;

    const xhttp = new XMLHttpRequest();
    xhttp.timeout = 5000;
    xhttp.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            document.getElementById("songs_list_table").innerHTML = this.responseText;
            const dates = document.getElementsByClassName("song_date");
            for (let i = 0; i < dates.length; i++) {
                dates.item(i).innerHTML = new Date(dates.item(i).innerHTML * 1000).toISOString().slice(0, 19).replace('T', ' ');
            }
            const names = document.getElementsByClassName("song_name");
            for (let i = 0; i < names.length; i++) {
                names.item(i).value = names.item(i).value.replace('.mid', '');
            }
            document.getElementById("songs_list_table").classList.remove("animate-pulse", "pointer-events-none");

            document.getElementById("songs_per_page").value = length;

            if (sortby === "nameAsc") {
                document.getElementById("sort_icon_nameAsc").classList.remove("hidden");
                document.getElementById("sort_icon_nameDesc").classList.add("hidden");
                document.getElementById("sort_by_name").classList.add("text-gray-800", "dark:text-gray-200");
                document.getElementById("sort_by_date").classList.remove("text-gray-800", "dark:text-gray-200");
            }
            if (sortby === "nameDesc") {
                document.getElementById("sort_icon_nameDesc").classList.remove("hidden");
                document.getElementById("sort_icon_nameAsc").classList.add("hidden");
                document.getElementById("sort_by_name").classList.add("text-gray-800", "dark:text-gray-200");
                document.getElementById("sort_by_date").classList.remove("text-gray-800", "dark:text-gray-200");
            }

            if (sortby === "dateAsc") {
                document.getElementById("sort_icon_dateAsc").classList.remove("hidden");
                document.getElementById("sort_icon_dateDesc").classList.add("hidden");
                document.getElementById("sort_by_date").classList.add("text-gray-800", "dark:text-gray-200");
                document.getElementById("sort_by_name").classList.remove("text-gray-800", "dark:text-gray-200");
            }
            if (sortby === "dateDesc") {
                document.getElementById("sort_icon_dateDesc").classList.remove("hidden");
                document.getElementById("sort_icon_dateAsc").classList.add("hidden");
                document.getElementById("sort_by_date").classList.add("text-gray-800", "dark:text-gray-200");
                document.getElementById("sort_by_name").classList.remove("text-gray-800", "dark:text-gray-200");
            }

        }
        translateStaticContent();
    };
    xhttp.open("GET", "/api/get_songs?page=" + page + "&length=" + length + "&sortby=" + sortby + "&search=" + search, true);
    xhttp.send();
}


function show_multicolors(colors, ranges, iteration) {
    try {
        colors = JSON.parse(colors);
        ranges = JSON.parse(ranges);
        iteration = JSON.parse(iteration);
    } catch (e) {
    }

    let multicolor_element = document.getElementById("Multicolor");
    let i = 0;
    multicolor_element.innerHTML = "<div class=\"flex items-center mb-4\">\n" +
        "            <input onclick=\"change_setting('multicolor_iteration', this.checked)\" id=\"multicolor_iteration_checkbox\" " +
        "           type=\"checkbox\" value=\"\" class=\"w-4 h-4 text-blue-600 bg-gray-100 rounded border-gray-300 " +
        "focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600\">\n" +
        "            <label for=\"default-checkbox\" class=\"pl-2 block uppercase tracking-wide text-xs font-bold mt-2 " +
        "text-gray-600 dark:text-gray-400\">Cycle through colors</label>\n" +
        "        </div>";

    const add_button = "<button onclick=\"this.classList.add('hidden');this.nextElementSibling.classList.remove('hidden')\" " +
        "id=\"multicolor_add\" class=\"w-full outline-none mb-2 bg-gray-100 dark:bg-gray-600 font-bold h-6 py-2 px-2 " +
        "rounded-2xl inline-flex items-center\">\n" +
        "   <svg xmlns=\"http://www.w3.org/2000/svg\" class=\"h-6 w-full justify-items-center text-green-400\" " +
        "fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
        "      <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 9v3m0 " +
        "0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z\"></path>\n" +
        "   </svg>\n" +
        "</button>\n" +
        "<button onclick=\"change_setting('add_multicolor', '0')\" id=\"multicolor_add\" " +
        "class=\"hidden w-full outline-none mb-2 bg-gray-100 dark:bg-gray-600 font-bold h-6 py-2 px-2 " +
        "rounded-2xl inline-flex items-center\">\n" +
        "<span class=\"w-full text-green-400\">Click to confirm</span></button>";
    multicolor_element.classList.remove("pointer-events-none", "opacity-50");
    multicolor_element.innerHTML += add_button;
    for (const element of colors) {

        const hex_color = rgbToHex(element[0], element[1], element[2]);

        const min = 20;
        const max = 108;

        const value_left = ranges[i][0];
        const value_right = ranges[i][1];

        const value_left_percent = (100 / (max - min)) * value_left - (100 / (max - min)) * min;
        const value_right_percent = (100 / (max - min)) * value_right - (100 / (max - min)) * min;

        const value_right_percent_reverse = 100 - value_right_percent;

        //append multicolor slider
        multicolor_element.innerHTML += '<div class="mb-2 bg-gray-100 dark:bg-gray-600" id="multicolor_' + i + '">' +
            '<label class="ml-2 inline block uppercase tracking-wide text-xs font-bold mt-2 text-gray-600 dark:text-gray-400">\n' +
            '                    Color ' + parseInt(i + 1) + '\n' +
            '                </label><div onclick=\'this.classList.add("hidden");' +
            'this.nextElementSibling.classList.remove("hidden")\' class="inline float-right text-red-400">' +
            '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">\n' +
            '  <path stroke-linecap="round" stroke-linejoin="round" ' +
            'stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 ' +
            '4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />\n' +
            '</svg>' +
            '</div><div onclick=\'change_setting("remove_multicolor", "' + i + '");' +
            'document.getElementById("Multicolor").classList.add("pointer-events-none","opacity-50")\' ' +
            'class="hidden inline float-right text-red-400">Click to confirm</div>' +
            '<input id="multicolor_input_' + i + '" type="color" value="' + hex_color + '"\n' +
            '                        class="cursor-pointer px-2 pt-2 h-8 w-full bg-gray-100 dark:bg-gray-600" ' +
            'oninput=\'editLedColor(event, "multicolor_' + i + '_")\'' +
            'onchange=\'change_setting("multicolor", this.value, ' + i + ')\'>\n' +
            '                <div id="multicolors_' + i + '" class="justify-center flex" ' +
            'onchange=\'change_color_input_multicolor(event, "multicolor_' + i + '_", "multicolor_input_' + i + '", "multicolor", ' + i + ')\'>\n' +
            '                    <span class="w-1/12 h-6 px-2 bg-gray-100 dark:bg-gray-600 text-red-400">R:</span>\n' +
            '                    <input id="multicolor_' + i + '_red" type="number" value="' + element[0] + '" min="0" max="255"\n' +
            '                           class="w-2/12 h-6 bg-gray-100 dark:bg-gray-600" onkeyup=enforceMinMax(this)>\n' +
            '                    <span class="w-1/12 h-6 px-2 bg-gray-100 dark:bg-gray-600 text-green-400">G:</span>\n' +
            '                    <input id="multicolor_' + i + '_green" type="number" value="' + element[1] + '" min="0" max="255"\n' +
            '                           class="w-2/12 h-6 bg-gray-100 dark:bg-gray-600" onkeyup=enforceMinMax(this)>\n' +
            '                    <span class="w-1/12 h-6 px-2 bg-gray-100 dark:bg-gray-600 text-blue-400">B:</span>\n' +
            '                    <input id="multicolor_' + i + '_blue" type="number" value="' + element[2] + '" min="0" max="255"\n' +
            '                           class="w-2/12 h-6 bg-gray-100 dark:bg-gray-600" onkeyup=enforceMinMax(this)>\n' +
            '                </div>' +
            '<div slider id="slider-distance">\n' +
            '  <div>\n' +
            '    <div inverse-left style="width:' + value_left_percent + '%;"></div>\n' +
            '    <div inverse-right style="width:' + value_right_percent_reverse + '%;"></div>\n' +
            '    <div range style="left:' + value_left_percent + '%;right:' + value_right_percent_reverse + '%;"></div>\n' +
            '    <span thumb style="left:' + value_left_percent + '%;"></span>\n' +
            '    <span thumb style="left:' + value_right_percent + '%;"></span>\n' +
            '    <div sign style="left:' + value_left_percent + '%;">\n' +
            '      <span id="value">' + value_left + '</span>\n' +
            '    </div>\n' +
            '    <div sign style="left:' + value_right_percent + '%;">\n' +
            '      <span id="value">' + value_right + '</span>\n' +
            '    </div>\n' +
            '  </div>\n' +
            '  <input type="range" tabindex="0" value="' + value_left + '" max="' + max + '" min="' + min + '" ' +
            'step="1" oninput="show_left_slider(this)" ' +
            'onchange=\'change_setting("multicolor_range_left", this.value, ' + i + ')\' />\n' +
            '  <input type="range" tabindex="0" value="' + value_right + '" max="' + max + '" min="' + min + '" ' +
            'step="1" oninput="show_right_slider(this)" ' +
            'onchange=\'change_setting("multicolor_range_right", this.value, ' + i + ')\' />\n' +
            '</div>' +
            '               </div>';
        i++;
    }
    if (i >= 3) {
        multicolor_element.innerHTML += add_button;
    }

    if (iteration === 1) {
        document.getElementById("multicolor_iteration_checkbox").checked = true;
    }
}

function show_note_offsets(note_offsets) {
    try {
        note_offsets = JSON.parse(note_offsets);
    } catch (e) {
    }

    let offset_element = document.getElementById("NoteOffsetEntry");
    if (!offset_element) {
        return;
    }
    var i = 0
    offset_element.innerHTML = "";
    const add_button = `<button onclick="this.classList.add('hidden');this.nextElementSibling.classList.remove('hidden')" id="note_offsets_add" class="w-full outline-none mb-2 bg-gray-100 dark:bg-gray-600 font-bold h-6 py-2 px-2 rounded-2xl inline-flex items-center">
   <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-full justify-items-center text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path>
   </svg>
</button>
<button onclick="change_setting('add_note_offset', '0');temporary_show_chords_animation();" id="note_offsets_add" class="hidden w-full outline-none mb-2 bg-gray-100 dark:bg-gray-600 font-bold h-6 py-2 px-2 rounded-2xl inline-flex items-center">
<span class="w-full text-green-400">Click to confirm</span></button>`;
    offset_element.classList.remove("pointer-events-none", "opacity-50");
    offset_element.innerHTML += add_button;
    for (const element of note_offsets) {
        offset_element.innerHTML += `<div class="mb-2 bg-gray-100 dark:bg-gray-600" id="noteoffset_${i}"><label class="ml-2 inline block uppercase tracking-wide text-xs font-bold mt-2 text-gray-600 dark:text-gray-400">
                    ${translate("note_offset")} ${parseInt(i + 1)}
                </label><div onclick='this.classList.add("hidden");this.nextElementSibling.classList.remove("hidden");temporary_show_chords_animation();' class="inline float-right text-red-400"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
</svg></div><div onclick='change_setting("remove_note_offset", "${i}");
    document.getElementById("NoteOffsetEntry").classList.add("pointer-events-none","opacity-50");
    temporary_show_chords_animation();' class="hidden inline float-right text-red-400">Click to confirm</div>
    <div id="note_offset_${i}" class="justify-center flex" 
    onchange='change_setting("update_note_offset", "${i}", document.getElementById("note_offset_${i}_num").value+ "," + document.getElementById("note_offset_${i}_off").value);temporary_show_chords_animation();'>
                    <span class="w-1/20 px-2 bg-gray-100 dark:bg-gray-600 text-red-400">${translate("light_number")}:</span>
                    <input id="note_offset_${i}_num" type="number" value="${element[0]}" min="0" max="255"
                           class="w-2/12 h-6 bg-gray-100 dark:bg-gray-600" onkeyup=enforceMinMax(this)>
                    <span class="w-1/20 h-6 px-2 bg-gray-100 dark:bg-gray-600 text-green-400">${translate("offset")}:</span>
                    <input id="note_offset_${i}_off" type="number" value="${element[1]}" min="-255" max="255"
                           class="w-2/12 h-6 bg-gray-100 dark:bg-gray-600" onkeyup=enforceMinMax(this)>
                </div>               </div>`;
        i++;
    }
    if (i >= 1) {
        let end_button = add_button.replace("add_note_offset", "append_note_offset")
        end_button = end_button.replace("note_offsets_add", "note_offsets_add2")
        offset_element.innerHTML += end_button;
    }
}

function show_left_slider(element) {
    element.value = Math.min(element.value, element.parentNode.childNodes[5].value);
    const value = (100 / (parseInt(element.max) - parseInt(element.min))) * parseInt(element.value) - (100 / (parseInt(element.max) - parseInt(element.min))) * parseInt(element.min);
    const children = element.parentNode.childNodes[1].childNodes;
    children[1].style.width = value + '%';
    children[5].style.left = value + '%';
    children[7].style.left = value + '%';
    children[11].style.left = value + '%';
    children[11].childNodes[1].innerHTML = element.value;
}

function show_right_slider(element) {
    element.value = Math.max(element.value, element.parentNode.childNodes[3].value);
    const value = (100 / (parseInt(element.max) - parseInt(element.min))) * parseInt(element.value) - (100 / (parseInt(element.max) - parseInt(element.min))) * parseInt(element.min);
    const children = element.parentNode.childNodes[1].childNodes;
    children[3].style.width = (100 - value) + '%';
    children[5].style.right = (100 - value) + '%';
    children[9].style.left = value + '%';
    children[13].style.left = value + '%';
    children[13].childNodes[1].innerHTML = element.value;
}

function change_color_input(prefix, color_input_id, setting_name) {
    const new_color = rgbToHex(
        parseInt(document.getElementById(prefix + "red").value, 10),
        parseInt(document.getElementById(prefix + "green").value, 10),
        parseInt(document.getElementById(prefix + "blue").value, 10));
    document.getElementById(color_input_id).value = new_color;
    change_setting(setting_name, new_color)
}

function change_color_input_multicolor(event, prefix, id_to_change, setting_name, i) {
    const new_color = rgbToHex(
        parseInt(document.getElementById(prefix + "red").value, 10),
        parseInt(document.getElementById(prefix + "green").value, 10),
        parseInt(document.getElementById(prefix + "blue").value, 10));
    document.getElementById(id_to_change).value = new_color;
    change_setting(setting_name, new_color, i)
}

const editLedColor = function (event, prefix) {
    document.getElementById(prefix + "red").value = hexToRgb(event.srcElement.value).r;
    document.getElementById(prefix + "green").value = hexToRgb(event.srcElement.value).g;
    document.getElementById(prefix + "blue").value = hexToRgb(event.srcElement.value).b;
};

function temporary_disable_button(element, timeout) {
    element.classList.add('pointer-events-none', 'animate-pulse');
    setTimeout(function () {
        element.classList.add('hidden');
        element.previousElementSibling.classList.remove('hidden');
        element.classList.remove('pointer-events-none', 'animate-pulse');
    }, timeout);
}

function handle_confirmation_button(element, delay = 1000) {
    element.classList.remove("hidden");
    element.classList.add("pointer-events-none", "animate-pulse")

    setTimeout(() => {
        element.classList.remove('pointer-events-none', "animate-pulse");
    }, delay);
}


function formatBytes(bytes, decimals = 2, suffix = true) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));
    if (suffix === true) {
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    } else {
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
    }
}

function animateValue(obj, start, end, duration, format = false) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        if (format) {
            obj.innerHTML = formatBytes(Math.floor(progress * (end - start) + start));
        } else {
            obj.innerHTML = Math.floor(progress * (end - start) + start);
        }
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

function AdjustingInterval(workFunc, interval, errorFunc) {
    const that = this;
    let expected, timeout;
    this.interval = interval;

    this.start = function () {
        workFunc();
        expected = Date.now() + this.interval;
        timeout = setTimeout(step, this.interval);
    }

    this.stop = function () {
        clearTimeout(timeout);
    }

    function step() {
        const drift = Date.now() - expected;
        if (drift > that.interval) {
            // You could have some default stuff here too...
            if (errorFunc) errorFunc();
        }
        workFunc();
        expected += that.interval;
        timeout = setTimeout(step, Math.max(0, that.interval - drift));
    }
}

function initialize_upload() {

// Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.getElementById("drop-area").addEventListener(eventName, preventDefaults, false)
        document.body.addEventListener(eventName, preventDefaults, false)
    })
    document.getElementById("drop-area").addEventListener('drop', handleDrop, false)
}

function preventDefaults(e) {
    e.preventDefault()
    e.stopPropagation()
}

function initializeProgress(numFiles) {
    document.getElementById("progress-bar").style.width = "0%";
    uploadProgress = []
    for (let i = numFiles; i > 0; i--) {
        uploadProgress.push(0)
    }
}

function updateProgress(fileNumber, percent) {
    uploadProgress[fileNumber] = percent
    let total = uploadProgress.reduce((tot, curr) => tot + curr, 0) / uploadProgress.length
    document.getElementById("progress-bar").style.width = total + "%";
    if (total >= 100 || total <= 0) {
        document.getElementById("progress-bar-group").classList.add("hidden");
    } else {
        document.getElementById("progress-bar-group").classList.remove("hidden");
    }
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    handleFiles(files)
}

function handleFiles(files) {
    document.getElementById("gallery").innerHTML = "";
    files = [...files]
    initializeProgress(files.length)
    files.forEach(uploadFile)
    files.forEach(previewFile)
}

function previewFile(file) {
    let reader = new FileReader()
    reader.readAsDataURL(file)

    reader.onloadend = function () {
        const name = document.createElement('div');
        name.setAttribute("id", file.name);
        name.innerHTML = file.name;
        name.className = "flex";
        document.getElementById('gallery').appendChild(name);
    }
}

function uploadFile(file, i) {
    const url = '/upload';
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    xhr.open('POST', url, true)
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest')

    // Update progress (can be used to show progress indicator)
    xhr.upload.addEventListener("progress", function (e) {
        updateProgress(i, (e.loaded * 100.0 / e.total) || 100)
    })

    xhr.addEventListener('readystatechange', function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            let response = JSON.parse(this.responseText);

            updateProgress(i, 100);

            if (response.success === true) {
                clearTimeout(get_songs_timeout);
                get_songs_timeout = setTimeout(function () {
                    get_songs();
                }, 2000);
                document.getElementById(response["song_name"]).innerHTML += "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"h-6 w-6 ml-2 text-green-400\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
                    "  <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\" />\n" +
                    "</svg>";
            } else {
                document.getElementById(response["song_name"]).innerHTML += "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"h-6 w-6 ml-2 text-red-500\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
                    "  <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M6 18L18 6M6 6l12 12\" />\n" +
                    "</svg>" + "<div class='text-red-400'>" + response.error + "</div>";
            }
        }
    })
    formData.append('file', file)
    xhr.send(formData)
}

function removeOptions(selectElement) {
    let i;
    const L = selectElement.options.length - 1;
    for (i = L; i >= 0; i--) {
        selectElement.remove(i);
    }
}

function remove_color_modes() {
    const slides = document.getElementsByClassName("color_mode");
    for (let i = 0; i < slides.length; i++) {
        slides.item(i).hidden = true;
    }
}

function temporary_show_chords_animation(force_start = false) {
    if(!animation_timeout_id || force_start){
        start_led_animation('chords', '0');
    }
    const stopAnimation = () => {
        start_led_animation('stop', 'normal');
        animation_timeout_id = '';
    };

    // Start or restart the timer whenever this function is called
    if (animation_timeout_id) {
        clearTimeout(animation_timeout_id);
    }

    animation_timeout_id = setTimeout(stopAnimation, 10000); // 10 seconds in milliseconds
}

//"waterfall" visualizer only updates the view when new note is played, this function makes the container scroll slowly
//to simulate smooth animation
function pageScroll() {
    document.getElementsByClassName("waterfall-notes-container")[0].scrollBy(0, -1);
    scrolldelay = setTimeout(pageScroll, 33);
}

function setAdvancedMode(mode) {
    advancedMode = mode;
    const advancedContentElements = document.querySelectorAll('.advanced-content');
    const newDisplayStyle = advancedMode ? 'block' : 'none';

    advancedContentElements.forEach(element => {
        element.style.display = newDisplayStyle;
    });

    // Save the user's choice in a cookie
    const modeValue = advancedMode ? 'advanced' : 'normal';
    setCookie('mode', modeValue, 365)
}

// Function to check the user's saved choice from cookies
function checkSavedMode() {
    const mode = getCookie('mode')
    if (mode) {
        const modeSwitch = document.getElementById('modeSwitch');

        if (mode === 'advanced') {
            modeSwitch.checked = true;
            setAdvancedMode(true);
        }
    }
}

function translate(key) {
    let lang = getLanguage();
    if (translations[lang] && translations[lang][key]) {
        return translations[lang][key];
    }
    // Return the original text if no translation found
    return key;
}

function translateStaticContent(lang) {
    let language = getLanguage();
    const elements = document.querySelectorAll('[data-translate]');
    elements.forEach((element) => {
        const key = element.getAttribute('data-translate');
        if (translations[language] && translations[language][key]) {
            element.textContent = translations[language][key];
        }
    });
}

function getLanguage() {
    let language = getCookie('lang');
    if (!language) {
        const browserLanguage = navigator.language.slice(0, 2);
        // Map supported languages to their respective codes
        const languageMap = {
            'pl': 'pl',
            'en': 'en',
            'de': 'de',
            'fr': 'fr',
            'es': 'es',
            'zh': 'zh',
            'hi': 'hi',
            'pt': 'pt',
            'ja': 'ja',
        };
        // If the browser language is supported, set it; otherwise, set to 'en'
        language = languageMap[browserLanguage] || "en";
    }
    return language;
}
