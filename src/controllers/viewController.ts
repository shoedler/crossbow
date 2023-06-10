// Copyright (C) 2023 - shoedler - github.com/shoedler
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.

import { Editor } from 'obsidian';
import { Suggestion } from 'src/model/suggestion';
import { CrossbowSettingsService } from 'src/services/settingsService';
import { CrossbowView } from 'src/view/view';

export class CrossbowViewController {
  public static MANUAL_REFRESH_BUTTON_ID = 'cb-refresh-button';

  constructor(private readonly settingsService: CrossbowSettingsService) {}

  public async revealOrCreateView(): Promise<void> {
    const existing = app.workspace.getLeavesOfType(CrossbowView.viewType);

    if (existing.length) {
      app.workspace.revealLeaf(existing[0]);
      return;
    }

    await app.workspace.getRightLeaf(false).setViewState({
      type: CrossbowView.viewType,
      active: true,
    });

    app.workspace.revealLeaf(app.workspace.getLeavesOfType(CrossbowView.viewType)[0]);
  }

  public doesCrossbowViewExist(): boolean {
    return app.workspace.getLeavesOfType(CrossbowView.viewType).length > 0;
  }

  public unloadView(): void {
    this.getCrossbowView()?.unload();
  }

  private getCrossbowView(): CrossbowView | undefined {
    return app.workspace.getLeavesOfType(CrossbowView.viewType)[0]?.view as CrossbowView;
  }

  public addOrUpdateSuggestions(suggestions: Suggestion[], targetEditor: Editor, fileHasChanged: boolean): void {
    const view = this.getCrossbowView();

    if (!view) return;
    if (fileHasChanged) view.clear();

    const showManualRefreshButton = !this.settingsService.getSettings().useAutoRefresh;
    view.update(suggestions, targetEditor, showManualRefreshButton);
  }
}
