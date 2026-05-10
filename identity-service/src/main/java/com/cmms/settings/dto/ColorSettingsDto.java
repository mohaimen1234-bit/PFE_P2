package com.cmms.settings.dto;

import lombok.Data;

@Data
public class ColorSettingsDto {
    private Long id;
    private String category;
    private String itemKey;
    private String scope;
    private String colorHex;
    private String textColorHex;
    private String defaultColorHex;
    private String defaultTextColorHex;
    private boolean isSystemDefault;
    private boolean active;
}
