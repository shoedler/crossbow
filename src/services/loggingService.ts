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

import { CrossbowSettingsService } from './settingsService';

export class CrossbowLoggingService {
  private static LOGGER_PREFIX = '🏹: ';

  public constructor(private readonly settingsService: CrossbowSettingsService) {}

  public debugLog(message: string): void {
    this.settingsService.getSettings().useLogging && console.log(CrossbowLoggingService.LOGGER_PREFIX + message);
  }

  public debugWarn(message: string): void {
    this.settingsService.getSettings().useLogging && console.warn(CrossbowLoggingService.LOGGER_PREFIX + message);
  }

  public static forceLog(type: 'warn' | 'log', message: string): void {
    console[type](CrossbowLoggingService.LOGGER_PREFIX + message);
  }
}
