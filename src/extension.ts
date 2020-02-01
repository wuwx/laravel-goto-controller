'use strict'

import {
    languages,
    window,
    workspace,
    commands
} from 'vscode'
import ControllerLinkProvider from './providers/ControllerLinkProvider'
import RouteLinkProvider from './providers/RouteLinkProvider'
import * as util from './util'

const debounce = require('lodash.debounce')
let providers = []
let classmap_file
let artisan_file

export async function activate({ subscriptions }) {
    util.readConfig()

    // config
    workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration('laravel_goto_controller')) {
            util.readConfig()
        }
    })

    // controllers & routes
    classmap_file = await workspace.findFiles(util.classmap_file_path, null, 1)
    artisan_file = await workspace.findFiles('**/artisan', null, 1)

    if (!classmap_file) {
        return window.showErrorMessage('please run "composer dump" first')
    }

    if (!artisan_file) {
        return window.showErrorMessage('"artisan" not found')
    }

    classmap_file = classmap_file[0]
    artisan_file = artisan_file[0]
    init()

    // route app_url
    subscriptions.push(commands.registerCommand('lgc.addAppUrl', util.saveAppURL))
    util.clearAll.event(() => {
        clearAll()
        initProvider()
    })
}

function init() {
    // links
    setTimeout(() => {
        if (window.activeTextEditor) {
            initProvider()
        }

        window.onDidChangeTextEditorVisibleRanges(
            debounce(function (e) {
                clearAll()
                initProvider()
            }, 250)
        )

        window.onDidChangeActiveTextEditor(
            debounce(function (editor) {
                if (editor) {
                    clearAll()
                    initProvider()
                }
            }, 250)
        )
    }, 2000)

    // scroll
    util.scrollToText()

    // file content changes
    util.listenToFileChanges(classmap_file, artisan_file, debounce)
}

function initProvider() {
    providers.push(languages.registerDocumentLinkProvider('php', new ControllerLinkProvider()))
    providers.push(languages.registerDocumentLinkProvider(['php', 'blade'], new RouteLinkProvider()))
}

function clearAll() {
    return providers.forEach((e) => e.dispose())
}

export function deactivate() {
    clearAll()
}