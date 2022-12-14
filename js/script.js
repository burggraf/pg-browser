"use strict";
const storage = idbStorage.createIDBStorage({
    name: "state-storage",
    conflicAction: "replace"
});
let config = {
    font_size: 15,
    memory_size: 128,
    vga_memory_size: 2,
    initial_state: {
        url: "../images/pg-browser-state-128.bin.zst"
    },
}
var emulator;

// this.serial_adapter = new SerialAdapterXtermJS(options["serial_container_xtermjs"], this.bus);
function setup_emulator() {
    console.log('loading emualtor');
    document.getElementById("terminal").innerHTML = "";
    emulator = window.emulator = new V86Starter({
        wasm_path: "../images/v86-no-jit.wasm",
        memory_size: config.memory_size * 1024 * 1024,
        vga_memory_size: config.vga_memory_size * 1024 * 1024,
        screen_container: document.getElementById("screen_container"),
        serial_container_xtermjs: document.getElementById("terminal"),
        bios: {
            url: "../images/seabios.bin",
        },
        vga_bios: {
            url: "../images/vgabios.bin",
        },
        cdrom: {
            url: "../images/v86-linux.iso",
        },
        //cmdline: "root=host9p rootfstype=9p rootflags=trans=virtio",
        // fastboot: true,
        // network_relay_url: "ws://localhost:8080/",
        initial_state: config.initial_state,
        autostart: true,
        disable_speaker: true,
        network_relay_url: "wss://relay.widgetry.org/",
        // preserve_mac_from_state_image: true,
    });
    console.log('*** emulator loaded', emulator);
    var state;

    document.getElementById("save_file").onclick = async function () {
        const new_state = await emulator.save_state();
        var a = document.createElement("a");
        a.download = "pg-browser-state-" + config.memory_size + ".bin";
        a.href = window.URL.createObjectURL(new Blob([new_state]));
        a.dataset.downloadurl = "application/octet-stream:" + a.download + ":" + a.href;
        a.click();

        this.blur();
    };

    document.getElementById("restore_file").onchange = function () {
        if (this.files.length) {
            var filereader = new FileReader();
            emulator.stop();

            filereader.onload = async function (e) {
                await emulator.restore_state(e.target.result);
                emulator.run();
                emulator.serial_adapter.term.focus();
                
                emulator.serial0_send('\n');
                emulator.serial0_send('/etc/init.d/S40network stop\n');
                emulator.serial0_send('/etc/init.d/S40network start\n');


            };

            filereader.readAsArrayBuffer(this.files[0]);

            this.value = "";
        }

        this.blur();
    };

    document.getElementById("upload_files").onchange = function (e) {
        console.log('upload_files', e, e.target.files.length);
        var files = e.target.files;
        for (var i = 0; i < files.length; i++) {
            var reader = new FileReader();
            reader.onload = function (file) {
                return function (e) {
                    var data = (new TextEncoder('UTF-8')).encode(e.target.result);
                    // console.log('emulator', emulator);
                    // console.log('emulator.create_file', emulator.create_file);
                    //emulator.create_file("/user/" + file.name, data)
                    emulator.create_file("/mnt/file.txt", data)
                    .then((result) => {console.log("uploaded " + file.name, 'result', result)})
                    .catch((error) => {console.log("upload " + file.name, 'upload error', error)});
                    emulator.create_file("file.txt", data)
                    .then((result) => {console.log("uploaded " + file.name, 'result', result)})
                    .catch((error) => {console.log("upload " + file.name, 'upload error', error)});
                    emulator.create_file("/user/file.txt", data)
                    .then((result) => {console.log("uploaded " + file.name, 'result', result)})
                    .catch((error) => {console.log("upload " + file.name, 'upload error', error)});
                    emulator.create_file("/mnt/" + file.name, data)
                    .then((result) => {console.log("uploaded " + file.name, 'result', result)})
                    .catch((error) => {console.log("upload " + file.name, 'upload error', error)});
                }
            }(files[i]);
            reader.readAsText(files[i]);
        }
    };


    V86Starter.prototype.keyboard_send_text = function (string) {
        for (var i = 0; i < string.length; i++) {
            this.keyboard_adapter.simulate_char(string[i]);
        }
    };


    emulator.clearState = async function () {
        await storage.delete('state-' + config.memory_size);
    }
    emulator.save = async function () {
        console.log('saving...');
        await emulator.clearState();
        const state = await emulator.save_state();
        const meta = {};
        const result = await storage.set('state-' + config.memory_size, state, meta);
        console.log('save result', result);
    }

    emulator.restore = async function () {
        console.log('restoring...');
        storage.get('state-' + config.memory_size).then(function (state) {
            if (state) {
                const byteLength = state.byteLength;
                // format byteLength with commas
                var size = byteLength.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                console.log('state is', size, 'bytes');
                emulator.stop();
                emulator.restore_state(state).then(function (result) {
                    console.log('restore result', result);
                    emulator.run();   
                    emulator.serial_adapter.term.focus();
                    
                    emulator.serial0_send('\n');
                    emulator.serial0_send('/etc/init.d/S40network stop\n');
                    emulator.serial0_send('/etc/init.d/S40network start\n');

                    console.log('emulator', emulator);
                    
                    // var term=new Terminal();
                    // term.open(document.getElementById("terminal"));
                }).catch(function (err) {
                    console.log('restore error', err);
                });
            } else {
                console.log('no state to restore');
            }
        }).catch(function (err) {
            console.log('restore error', err);
        });
    }
    emulator.add_listener("emulator-started", function () {
        console.log('*** emulator started');
    });
    emulator.add_listener("emulator-stopped", function () {
        console.log('*** emulator stopped');
    });
    emulator.add_listener("emulator-ready", function () {
        console.log('********************************************************');
        console.log('*** emulator ready', emulator);
        console.log('********************************************************');
        setTimeout(() => {
            // emulator.serial0_send('\n');
            // emulator.serial0_send('udhcpc\n');
            // emulator.serial0_send('reset\n');
            // emulator.serial0_send('psql -U postgres\n');
            emulator.serial_adapter.term.element.children[0].style.width = 0;
            emulator.serial_adapter.term.focus();
        }, 2000);
    });
    const fullboot = document.getElementById("fullboot").checked;
    let booted = false;
    if (fullboot) {
        let serialBootBuffer = '';
        const my_listener = emulator.add_listener("serial0-output-char", async function(chr) {
            if (booted) return;
            serialBootBuffer += chr;
            // console.log('serial0-output-char', chr);
            console.log('serialBootBuffer', serialBootBuffer);
            if (serialBootBuffer.endsWith('# ')) {
                    // done booting
                serialBootBuffer = '';
                booted = true;
                console.log('done booting');
                document.getElementById("screen_container").style.display = "none";
                emulator.remove_listener("serial0-output-char", my_listener);
            }
        });    
    }
    emulator.add_listener("download-progress", function (e) {
        console.log('*** download progress', e);
        const el = document.getElementById("progress");
        if (e.loaded >= e.total) {
            el.innerHTML = "";
        } else {
            const percent = (e.loaded / Math.max(e.total, 1)) * 100;
            el.innerHTML = "<h3>Loading: " + e.file_name.replace("../images/", "") + " " + percent
                .toFixed(2) + "%</h3>";
        }
        /*
        file_count: 4
        file_index: 3
        file_name: "../images/pg-browser-state-96.bin.zst"
        lengthComputable: true
        loaded: 24793069
        total: 24793069
        */
    });
    emulator.add_listener("9p-attach", function () {
        console.log('*** 9p-attach');
    });
    setTimeout(function () {
        updateFontSize();
        const fullboot = document.getElementById("fullboot").checked;
        if (!fullboot) {
            emulator.restore(); // restore from indexedDB storage
            console.log('*** done restoring emulator', emulator);    
        }
    }, 500);
}
window.onload = function () {
    const saved_config = localStorage.getItem('config');
    try {
        if (saved_config) {
            config = JSON.parse(saved_config);
            console.log('config loaded from localStorage', config);
        }
    } catch (err) {
        console.error('error restoring config from localStorage', err);
    }
    let memorysizeElement = document.getElementById("memorysize");
    memorysizeElement.value = config.memory_size;
    document.getElementById("fontsize").value = config.font_size;
    setup_emulator();
}

function updateFontSize() {
    console.log('FONT SIZE WAS', emulator.serial_adapter.term.options.fontSize);
    //emulator.screen_adapter.set_size_text(document.getElementById("font_size").value, document.getElementById("font_size").value);
    try {
        config.font_size = parseInt(document.getElementById("fontsize").value, 10) || 14;
        if (config.font_size < 4 || config.font_size > 90) {
            config.font_size = 15;
        }
    } catch (err) {
        console.log('error parsing font size', err);
        config.font_size = 15;
    }
    emulator.serial_adapter.term.options.fontSize = config.font_size;
    if (emulator.serial_adapter.term.element && emulator.serial_adapter.term.element.children[0]) {
        emulator.serial_adapter.term.element.children[0].style.width = 0;
        localStorage.setItem('config', JSON.stringify(config));    
    } else {
        console.log('terminal not initialized, cannot update find size yet');
    }
}

function updateMemorySize() {
    const fullboot = document.getElementById("fullboot").checked;
    const newMemorySize = document.getElementById("memorysize").value;
    console.log('new memory size', newMemorySize);
    try {
        config.memory_size = parseInt(newMemorySize, 10) || 96;
        if (!config.memory_size || config.memory_size < 96) {
            config.memory_size = 96;
            document.getElementById("memorysize").value = config.memory_size;
        }
        if (fullboot) {
            config.initial_state = {};
        } else {
            config.initial_state.url = "../images/pg-browser-state-" + config.memory_size + ".bin.zst";
        }
        emulator.stop();
        if (fullboot) {
            document.getElementById("screen_container").style.display = "block";
        }
        setup_emulator();
        localStorage.setItem('config', JSON.stringify(config));
    } catch (e) {
        console.log('updateMemorySize error', e);
    }
}

// function sendText() {
//     let text = document.getElementById("textarea").value;
//     console.log('text is', text);
//     const arr = text.split("\n");
//     console.log('text array is', arr);
//     const processArray = () => {
//         if (arr.length === 0) {
//             return;
//         } else {
//             const line = arr.shift();
//             emulator.keyboard_send_text(line + "\n");
//             setTimeout(processArray, 200);
//         }
//     }
//     processArray();
// }
