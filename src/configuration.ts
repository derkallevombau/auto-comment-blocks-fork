import { Disposable, ExtensionContext, IndentAction, LanguageConfiguration, OnEnterRule, TextEditor, TextEditorEdit, commands, languages, workspace, } from 'vscode';

import { Rules } from './rules';
import { singleLineConfig } from 'language-configuration/single-line-configuration';
import { multiLineConfig } from 'language-configuration/multi-line-configuration';

export class Configuration
{
	private readonly extensionName          = 'auto-comment-blocks';
	private readonly singleLineBlockCommand = 'auto-comment-blocks.singleLineBlock';

	private readonly singleLineBlockOnEnter = 'singleLineBlockOnEnter';
	private readonly slashStyleBlocks       = 'slashStyleBlocks';
	private readonly hashStyleBlocks        = 'hashStyleBlocks';
	private readonly semicolonStyleBlocks   = 'semicolonStyleBlocks';
	private readonly disabledLanguages      = 'disabledLanguages';

	private disabledLanguageList = this.getConfiguration().get<string[]>(this.disabledLanguages);

	private singleLineStyleFromLangId = new Map<string, string>();

	private getConfiguration()
	{
		return workspace.getConfiguration(this.extensionName);
	}

	private isLangIdDisabled(langId: string)
	{
		return this.disabledLanguageList.includes(langId);
	}

	private setLanguageConfiguration(langId: string, multiLine?: boolean, singleLineStyle?: string): Disposable
	{
		const langConfig: LanguageConfiguration =
		{
			onEnterRules: []
		};

		if (multiLine)
		{
			langConfig.onEnterRules = langConfig.onEnterRules.concat(Rules.multilineEnterRules);
		}

		const isOnEnter = this.getConfiguration().get<boolean>(this.singleLineBlockOnEnter);

		if (isOnEnter && singleLineStyle)
		{
			if (singleLineStyle === '//')
			{
				langConfig.onEnterRules = langConfig.onEnterRules.concat(Rules.slashEnterRules);
			}
			else if (singleLineStyle === '#')
			{
				langConfig.onEnterRules = langConfig.onEnterRules.concat(Rules.hashEnterRules);
			}
			else if (singleLineStyle === ';')
			{
				langConfig.onEnterRules = langConfig.onEnterRules.concat(Rules.semicolonEnterRules);
			}
		}

		return languages.setLanguageConfiguration(langId, langConfig);
	}

	// Populates `this.singleLineStyleFromLangId`
	private getSingleLineLanguages()
	{
		const commentStyles = Object.keys(singleLineConfig);

		for (const commentStyle of commentStyles)
		{
			for (const langId of singleLineConfig[commentStyle])
			{
				if (!this.isLangIdDisabled(langId))
				{
					this.singleLineStyleFromLangId.set(langId, commentStyle);
				}
			}
		}

		// Add user-customized langIds and comment styles to the map

		const customSlashLangs = this.getConfiguration().get<string[]>(this.slashStyleBlocks);

		for (const langId of customSlashLangs)
		{
			if (langId && langId.length > 0)
			{
				this.singleLineStyleFromLangId.set(langId, '//');
			}
		}

		const customHashLangs = this.getConfiguration().get<string[]>(this.hashStyleBlocks);

		for (const langId of customHashLangs)
		{
			if (langId && langId.length > 0)
			{
				this.singleLineStyleFromLangId.set(langId, '#');
			}
		}

		const customSemicolonLangs = this.getConfiguration().get<string[]>(this.semicolonStyleBlocks);

		for (const langId of customSemicolonLangs)
		{
			if (langId && langId.length > 0)
			{
				this.singleLineStyleFromLangId.set(langId, ';');
			}
		}
	}

	configureCommentBlocks(context: ExtensionContext)
	{

		// Populate `this.singleLineStyleFromLangId`
		this.getSingleLineLanguages();

		// Set language configurations

		const multiLineLangs = multiLineConfig['languages'];

		for (const [langId, style] of this.singleLineStyleFromLangId)
		{
			const multiLine = multiLineLangs.includes(langId);

			context.subscriptions.push(this.setLanguageConfiguration(langId, multiLine, style));
		}

		for (const langId of multiLineLangs)
		{
			if (!this.singleLineStyleFromLangId.has(langId) && !this.isLangIdDisabled(langId))
			{
				context.subscriptions.push(this.setLanguageConfiguration(langId, true));
			}
		}
	}

	private handleSingleLineBlock(textEditor: TextEditor, edit: TextEditorEdit)
	{
		const langId = textEditor.document.languageId;
		let   style  = this.singleLineStyleFromLangId.get(langId);

		if (style && textEditor.selection.isEmpty)
		{
			const line          = textEditor.document.lineAt(textEditor.selection.active);
			let   isCommentLine = true;
			let   indentRegex: RegExp;

			if (style === '//' && line.text.search(/^\s*\/\/\s*/) !== -1)
			{
				indentRegex = /\//;

				if (line.text.search(/^\s*\/\/\/\s*/) !== -1)
				{
					style = '///';
				}

			}
			else if (style === '#' && line.text.search(/^\s*#\s*/) !== -1)
			{
				indentRegex = /#/;
			}
			else if (style === ';' && line.text.search(/^\s*;\s*/) !== -1)
			{
				indentRegex = /;/;
			}
			else
			{
				isCommentLine = false;
			}

			if (!isCommentLine)
			{
				return;
			}

			let   indentedNewLine = '\n' + line.text.substring(0, line.text.search(indentRegex));
			const isOnEnter       = this.getConfiguration().get<boolean>(this.singleLineBlockOnEnter);

			if (!isOnEnter)
			{
				indentedNewLine += style + ' ';
			}

			edit.insert(textEditor.selection.active, indentedNewLine);
		}
	}

	registerCommands()
	{
		commands.registerTextEditorCommand(this.singleLineBlockCommand,
			(textEditor, edit, args) =>
			{
				this.handleSingleLineBlock(textEditor, edit);
			}
		);
	}
}
