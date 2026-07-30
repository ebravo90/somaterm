import { config as baseConfig } from './wdio.conf.ts';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

let tauriDriver: ChildProcess;

export const config = {
    ...baseConfig,
    port: 4444,
    path: '/',
    capabilities: [{
        maxInstances: 1,
        'tauri:options': {
            application: path.resolve(process.cwd(), 'src-tauri/target/debug/app'),
        }
    }],
    beforeSession: function () {
        console.log('Starting tauri-driver...');
        tauriDriver = spawn('tauri-driver', [], { stdio: [null, process.stdout, process.stderr] });
        return new Promise(resolve => setTimeout(resolve, 2000));
    },
    afterSession: function () {
        console.log('Killing tauri-driver...');
        if (tauriDriver) {
            tauriDriver.kill();
        }
    }
};

// Remove baseUrl for native execution
delete config.baseUrl;
