import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

import { AppState, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import {
    Excalidraw,
    exportToSvg,
    loadFromBlob,
    loadSceneOrLibraryFromBlob,
    MIME_TYPES,
    THEME,
} from "@excalidraw/excalidraw";

import "@excalidraw/excalidraw/index.css";
import "./App.css";

function App() {
    const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI>();

    useEffect(() => {
        invoke<string>('get_initial_svg').then((svgContent) => {
            if (!excalidrawAPI) {
                console.warn("Excalidraw API not initialized yet");
                return;
            }
            console.log("Loading initial SVG content");
            loadFromBlob(
                new Blob([svgContent], { type: MIME_TYPES.svg }),
                excalidrawAPI.getAppState(),
                null
            ).then((contents) => {
                excalidrawAPI.updateScene(contents);
                if (contents.files) {
                    excalidrawAPI.addFiles(Object.values(contents.files));
                }
            });
        });
    }, [excalidrawAPI]);

    return (
        <main className="container">
            <Excalidraw
                excalidrawAPI={(api) => setExcalidrawAPI(api)}
                initialData={{
                    appState: {
                        theme: THEME.DARK,
                        gridModeEnabled: true,
                    },
                }}
                theme={THEME.DARK}
                onChange={(elements, state, files) => {
                    exportToSvg({
                        elements: elements,
                        appState: { ...state, exportBackground: false, exportWithDarkMode: true, exportEmbedScene: true },
                        files: files,
                    }).then((svg: SVGSVGElement) => {
                        invoke<void>("save_svg", { svg: svg.outerHTML });
                    });
                }}
            />
        </main>
    );
}

export default App;
