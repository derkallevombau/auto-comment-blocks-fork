'use strict';

import { languages, commands, workspace, ExtensionContext, IndentAction, LanguageConfiguration, OnEnterRule, Disposable } from 'vscode';
import { Configuration } from './configuration';

export function activate(context: ExtensionContext) {
	
  let languageIdArray = getLanguageIds();
	languageIdArray.forEach((languageId) => {

    let disposable = setLanguageConfiguration(languageId);
		context.subscriptions.push(disposable);
  });

	registerCommands();
}

export function deactivate() {
  
}

function getLanguageIds(): Array<string> {
	return Configuration.getConfiguration()
	    .get<Array<string>>(Configuration.languagesSetting);
}

function setLanguageConfiguration(languageId: string): Disposable {
  let config = Configuration.languageConfiguration;
  if ((languageId === 'c' || languageId === 'cpp') &&
      Configuration.getConfiguration()
          .get<Boolean>(Configuration.singleLineBlocksSetting)) {

    config.onEnterRules = config.onEnterRules
        .concat(Configuration.singleLineBlockEnterRules);
  }

  return languages.setLanguageConfiguration(languageId, config);
}

function registerCommands() {
  commands.registerTextEditorCommand(Configuration.breakSingleLineBlockCommand, 
      (textEditor, edit, args) => {

		if (Configuration.getConfiguration().get<Boolean>
				(Configuration.singleLineBlocksSetting) &&
				(textEditor.document.languageId === 'c' || 
				textEditor.document.languageId === 'cpp') &&
				textEditor.selection.isEmpty) {
			
			let line = textEditor.document.lineAt(textEditor.selection.active);
			if (line.text.search(/^\s*\/\/\/\s*/) !== -1 ||
				line.text.search(/^\s*\/\/\s*/) !== -1) {
				
				let indentedNewline = '\n' + line.text.substring(0, line.text.search(/\//));
				edit.insert(textEditor.selection.active, indentedNewline);
			}
		}
	});
}
