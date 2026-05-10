package com.cmms.settings.dto;

import lombok.Data;

@Data
public class ColorUpdateRequest {
    private Long id;
    private String colorHex;
    private String textColorHex;
    private boolean active;
}
