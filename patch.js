const fs = require('fs');

function patchFile(file) {
    let content = fs.readFileSync(file, 'utf-8');
    content = content.replace("await invoke('get_file_tree')", "await (console.log('INTERNALS:', window.__TAURI_INTERNALS__), invoke('get_file_tree'))");
    fs.writeFileSync(file, content);
}

patchFile('src/components/Widgets/FileExplorerWidget.tsx');
