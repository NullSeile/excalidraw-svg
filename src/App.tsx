import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from '@tauri-apps/api/event';
import { getMatches } from "@tauri-apps/plugin-cli";

import { AppState, BinaryFiles, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import {
    Excalidraw,
    exportToSvg,
    loadFromBlob,
    MIME_TYPES,
    THEME,
} from "@excalidraw/excalidraw";

import "@excalidraw/excalidraw/index.css";
import "./App.css";
import { NonDeletedExcalidrawElement, Ordered } from "@excalidraw/excalidraw/element/types";

const SVG_DOCUMENT_PREAMBLE = `<?xml version="1.0" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
`;

const framerate = 30;
const frameDuration = 1000 / framerate;
function App() {
    const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI>();
    const [renderOnChange, setRenderOnChange] = useState(false);

    let timeLastWrite = Date.now()


    //Utils
    let writeSvgFile = async (elements: readonly Ordered<NonDeletedExcalidrawElement>[], state: AppState, files: BinaryFiles) => {
        console.info("Attempting to save file")
        const svg = await exportToSvg({
            elements: elements,
            appState: {
                ...state,
                exportBackground: false,
                exportWithDarkMode: true,
                exportEmbedScene: true
            },
            files: files,
        })
        const code_status = await invoke<number>("save_svg", { svg: (SVG_DOCUMENT_PREAMBLE + svg.outerHTML) });
        if (code_status != 0) {
            console.warn("Couldn't save SVG to file");
        } else {
            timeLastWrite = Date.now();
        }
        return code_status
    };

    let saveSVG = () => {
        if (!excalidrawAPI) {
            console.warn("SaveSVG: Excalidraw API not initialized yet");
            return;
        }
        const elements = excalidrawAPI.getSceneElements();
        const state = excalidrawAPI.getAppState();
        const files = excalidrawAPI.getFiles();
        writeSvgFile(elements, state, files)
    }

    let realTimeSaveSVG = (elements: readonly Ordered<NonDeletedExcalidrawElement>[], state: AppState, files: BinaryFiles) => {
        if (Date.now() - timeLastWrite < frameDuration) {
            return
        }
        writeSvgFile(elements, state, files)
    }

    //Initialize
    useEffect(() => {
        if (!excalidrawAPI) {
            console.warn("Initialize: Excalidraw API not initialized yet");
            return;
        }
        //Setup saving to file
        getMatches().then(matches => {
            if (matches.args.autosave?.value) {
                console.info("Saving to file automatically every 30s")
                setInterval(() => {
                    saveSVG();
                }, 30000);
            } else if (matches.args.rtsave?.value) {
                console.info("Saving to file in real time")
                setRenderOnChange(true);
            }
        })
        // Load file from backend
        invoke<string>('get_initial_svg').then((svgContent) => {
            console.info("Loading initial SVG content");
            loadFromBlob(
                new Blob([svgContent], { type: MIME_TYPES.svg }),
                excalidrawAPI.getAppState(),
                null
            ).then((contents) => {
                excalidrawAPI.updateScene({
                    ...contents,
                    appState: { ...contents.appState, isLoading: false },
                });
                if (contents.files) {
                    excalidrawAPI.addFiles(Object.values(contents.files));
                }
            }).catch(error => {
                console.warn(error);
                console.info("Starting empty scene");
                excalidrawAPI.resetScene({ resetLoadingState: true });
            });
        });

    }, [excalidrawAPI]);

    useEffect(() => {
        // let unlisten: (() => void) | undefined;
        // const setup = async () => {
        //     unlisten = await listen<void>('window-close-requested', async (event) => {
        //         saveSVG();
        //         console.info(
        //             "WINDOW CLOSE REQUEST"
        //         );
        //         // await invoke<void>("close_app");
        //     });
        // };
        // setup();

        listen<void>('window-close-requested', async (event) => {
            saveSVG();
            console.info(
                "WINDOW CLOSE REQUEST"
            );
            // await invoke<void>("close_app");
        });

        document.getElementById("main-container")!.addEventListener("keydown", (e) => {
            if (e.ctrlKey) {
                switch (e.key) {
                    case "s": {
                        e.preventDefault();
                        saveSVG();
                    }
                }
            } else {
                switch (e.key) {
                    case "t": {
                    }
                }
            }
        })
    })

    return (
        <main className="container" id="main-container">
            <Excalidraw
                handleKeyboardGlobally={true}
                excalidrawAPI={(api) => {
                    setExcalidrawAPI(api);
                    console.debug("api_set")
                }}
                zenModeEnabled={false}
                gridModeEnabled={true}
                onChange={renderOnChange ? realTimeSaveSVG : undefined}
                theme={THEME.DARK}
            />
        </main>
    );
}

export default App;
