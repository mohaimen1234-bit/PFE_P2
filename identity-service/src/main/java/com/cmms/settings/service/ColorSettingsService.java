package com.cmms.settings.service;

import com.cmms.settings.dto.ColorSettingsDto;
import com.cmms.settings.dto.ColorUpdateRequest;
import com.cmms.settings.entity.ColorSettings;
import com.cmms.settings.repository.ColorSettingsRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ColorSettingsService {

    private final ColorSettingsRepository colorSettingsRepository;

    @PostConstruct
    public void seedDefaults() {
        if (colorSettingsRepository.count() == 0) {
            log.info("Seeding default color settings...");
            
            // STATUS defaults
            seedColor("STATUS", "SCHEDULED", "#3B82F6", "#FFFFFF", 1);
            seedColor("STATUS", "IN_PROGRESS", "#06B6D4", "#FFFFFF", 2);
            seedColor("STATUS", "COMPLETED", "#10B981", "#FFFFFF", 3);
            seedColor("STATUS", "DELAYED", "#F59E0B", "#FFFFFF", 4);
            seedColor("STATUS", "CLOSED", "#6B7280", "#FFFFFF", 5);
            seedColor("STATUS", "CANCELLED", "#EF4444", "#FFFFFF", 6);
            seedColor("STATUS", "PENDING_VALIDATION", "#8B5CF6", "#FFFFFF", 7);
            
            // MAINTENANCE_TYPE defaults
            seedColor("MAINTENANCE_TYPE", "PREVENTIVE", "#6366F1", "#FFFFFF", 1);
            seedColor("MAINTENANCE_TYPE", "CORRECTIVE", "#EF4444", "#FFFFFF", 2);
            seedColor("MAINTENANCE_TYPE", "REGULATORY", "#F59E0B", "#FFFFFF", 3);
            seedColor("MAINTENANCE_TYPE", "PREDICTIVE", "#10B981", "#FFFFFF", 4);
            
            // NOTIFICATION defaults
            seedColor("NOTIFICATION", "INFO", "#6B7280", "#FFFFFF", 1);
            seedColor("NOTIFICATION", "WARNING", "#F59E0B", "#FFFFFF", 2);
            seedColor("NOTIFICATION", "CRITICAL", "#EF4444", "#FFFFFF", 3);
            seedColor("NOTIFICATION", "SUCCESS", "#10B981", "#FFFFFF", 4);
            seedColor("NOTIFICATION", "WO_CREATED", "#8B5CF6", "#FFFFFF", 5);
        }
    }

    private void seedColor(String category, String itemKey, String colorHex, String textColorHex, int sortOrder) {
        ColorSettings setting = new ColorSettings();
        setting.setCategory(category);
        setting.setItemKey(itemKey);
        setting.setScope("GLOBAL");
        setting.setColorHex(colorHex);
        setting.setTextColorHex(textColorHex);
        setting.setDefaultColorHex(colorHex);
        setting.setDefaultTextColorHex(textColorHex);
        setting.setSystemDefault(true);
        setting.setActive(true);
        setting.setSortOrder(sortOrder);
        colorSettingsRepository.save(setting);
    }

    public List<ColorSettingsDto> getAllColors() {
        return colorSettingsRepository.findAllByActiveTrueOrderByCategoryAscSortOrderAsc()
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public List<ColorSettingsDto> updateColors(List<ColorUpdateRequest> requests) {
        for (ColorUpdateRequest request : requests) {
            ColorSettings setting = colorSettingsRepository.findById(request.getId())
                    .orElseThrow(() -> new RuntimeException("Setting not found: " + request.getId()));
            
            setting.setColorHex(request.getColorHex());
            setting.setTextColorHex(request.getTextColorHex());
            setting.setActive(request.isActive());
            setting.setSystemDefault(false);
            
            colorSettingsRepository.save(setting);
        }
        return getAllColors();
    }

    @Transactional
    public void resetToDefault(Long id) {
        ColorSettings setting = colorSettingsRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Setting not found: " + id));
        
        setting.setColorHex(setting.getDefaultColorHex());
        setting.setTextColorHex(setting.getDefaultTextColorHex());
        setting.setSystemDefault(true);
        colorSettingsRepository.save(setting);
    }

    private ColorSettingsDto mapToDto(ColorSettings entity) {
        ColorSettingsDto dto = new ColorSettingsDto();
        dto.setId(entity.getId());
        dto.setCategory(entity.getCategory());
        dto.setItemKey(entity.getItemKey());
        dto.setScope(entity.getScope());
        dto.setColorHex(entity.getColorHex());
        dto.setTextColorHex(entity.getTextColorHex());
        dto.setDefaultColorHex(entity.getDefaultColorHex());
        dto.setDefaultTextColorHex(entity.getDefaultTextColorHex());
        dto.setSystemDefault(entity.isSystemDefault());
        dto.setActive(entity.isActive());
        return dto;
    }
}
