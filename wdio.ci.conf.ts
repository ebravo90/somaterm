import { config as baseConfig } from './wdio.conf.ts';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

let tauriDriver: ChildProcess;

export const config = {
    ...baseConfig,
    capabilities: [{
        maxInstances: 1,
        browserName: 'wry',
        'tauri:options': {
            application: path.resolve(process.cwd(), 'src-tauri/target/debug/app'),
        }
    }],
    onPrepare: function () {
        console.log('Starting tauri-driver...');
        tauriDriver = spawn('tauri-driver', [], { stdio: [null, process.stdout, process.stderr] });
    },
    beforeSession: function () {
        return new Promise(resolve => setTimeout(resolve, 2000));
    },
    onComplete: function () {
        console.log('Killing tauri-driver...');
        if (tauriDriver) {
            tauriDriver.kill();
        }
    }
};

// Remove baseUrl for native execution
delete config.baseUrl;
