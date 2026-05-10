package com.cmms.settings.controller;

import com.cmms.settings.dto.ColorSettingsDto;
import com.cmms.settings.dto.ColorUpdateRequest;
import com.cmms.settings.service.ColorSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/settings/colors")
@RequiredArgsConstructor
public class ColorSettingsController {

    private final ColorSettingsService colorSettingsService;

    @GetMapping
    public ResponseEntity<List<ColorSettingsDto>> getAllColors() {
        return ResponseEntity.ok(colorSettingsService.getAllColors());
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'ADMINISTRATOR')")
    @PutMapping
    public ResponseEntity<List<ColorSettingsDto>> updateColors(@RequestBody List<ColorUpdateRequest> requests) {
        return ResponseEntity.ok(colorSettingsService.updateColors(requests));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'ADMINISTRATOR')")
    @PostMapping("/{id}/reset")
    public ResponseEntity<Void> resetToDefault(@PathVariable Long id) {
        colorSettingsService.resetToDefault(id);
        return ResponseEntity.ok().build();
    }
}
