import { expect, browser, $ } from '@wdio/globals'

describe('File Explorer E2E Tests', () => {
    beforeEach(async () => {
        if (browser.capabilities.browserName !== 'wry') {
            await browser.url('/');
        }
        
        // Wait for root
        // Wait for React and Zustand store to be fully initialized
        await browser.waitUntil(
            async () => await browser.execute(() => typeof (window as any).__store !== 'undefined'),
            { timeout: 15000, timeoutMsg: 'Store was not initialized' }
        );
        
        // Setup base intercept for Tauri invokes and mount widget
        await browser.execute(() => {
            const originalInvoke = (window as any).__TAURI_INTERNALS__.invoke;
            (window as any).__interceptedCommands = {};
            (window as any).__command_calls = {};
            
            (window as any).__TAURI_INTERNALS__.invoke = function(cmd: string, args: any) {
                if (!(window as any).__command_calls[cmd]) {
                    (window as any).__command_calls[cmd] = [];
                }
                (window as any).__command_calls[cmd].push(args);
                
                if ((window as any).__interceptedCommands[cmd]) {
                    return (window as any).__interceptedCommands[cmd](args);
                }
                
                if (cmd === 'get_initial_cwd') {
                    return Promise.resolve('/Users/dev/project');
                }
                if (cmd === 'get_file_tree') {
                    if (args.targetPath === '/Users/dev/project') {
                        return Promise.resolve({
                            name: 'project',
                            path: '/Users/dev/project',
                            is_dir: true,
                            children: [
                                {
                                    name: 'src',
                                    path: '/Users/dev/project/src',
                                    is_dir: true
                                },
                                {
                                    name: 'package.json',
                                    path: '/Users/dev/project/package.json',
                                    is_dir: false
                                }
                            ]
                        });
                    }
                    if (args.targetPath === '/Users/dev') {
                        return Promise.resolve({
                            name: 'dev',
                            path: '/Users/dev',
                            is_dir: true,
                            children: [
                                {
                                    name: 'project',
                                    path: '/Users/dev/project',
                                    is_dir: true
                                }
                            ]
                        });
                    }
                    if (args.targetPath === '/Users/dev/project/src') {
                        return Promise.resolve({
                            name: 'src',
                            path: '/Users/dev/project/src',
                            is_dir: true,
                            children: [
                                {
                                    name: 'main.ts',
                                    path: '/Users/dev/project/src/main.ts',
                                    is_dir: false
                                }
                            ]
                        });
                    }
                    return Promise.resolve({ name: 'unknown', path: args.targetPath, is_dir: true, children: [] });
                }
                
                return originalInvoke(cmd, args);
            };

            const store = (window as any).__store.getState();
            store.setActiveWidget(null); // Unmount
        });
        
        await browser.pause(100);
        
        await browser.execute(() => {
            const store = (window as any).__store.getState();
            store.setActiveWidget({ type: 'file_explorer' }); // Remount
        });
        
        await browser.pause(500); // Wait for initial tree load
    });

    it('Initial Directory Context: loads specific path as root', async () => {
        // Assert File Explorer header displays project
        const span = await $('span*=project');
        await span.waitForExist();
        
        // File tree should render the root node 'project' and its children
        const rootNode = await $('span=project');
        await rootNode.waitForExist();
        expect(await rootNode.isExisting()).toBe(true);

        const packageJson = await $('span=package.json');
        await packageJson.waitForExist();
        expect(await packageJson.isExisting()).toBe(true);
    });

    it('Navigate Up One Level: updates root path to parent', async () => {
        const goUpBtn = await $('button[title="Go Up"]');
        await goUpBtn.waitForExist();
        
        await browser.execute((btn) => (btn as HTMLElement).click(), goUpBtn);
        await browser.pause(500);

        // Now root path should be /Users/dev, which has child 'project'
        const devHeader = await $('span*=dev');
        await devHeader.waitForExist();
        
        const rootNode = await $('span=dev');
        await rootNode.waitForExist();
        expect(await rootNode.isExisting()).toBe(true);
    });

    it('Expand Folders: fetches and displays nested children', async () => {
        // The src folder is rendered
        const srcFolder = await $('span=src');
        await srcFolder.waitForExist();
        
        // main.ts should not be visible yet because src is not expanded
        const mainTs = await $('span=main.ts');
        expect(await mainTs.isExisting()).toBe(false);
        
        // Click src folder to expand
        // Find the clickable parent container of the src folder text
        const srcParent = await srcFolder.parentElement();
        await browser.execute((el) => (el as HTMLElement).click(), srcParent);
        
        await browser.pause(500);

        // Now main.ts should be visible
        await mainTs.waitForExist();
        expect(await mainTs.isExisting()).toBe(true);
    });
});
