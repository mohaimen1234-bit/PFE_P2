package com.cmms.settings.repository;

import com.cmms.settings.entity.ColorSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ColorSettingsRepository extends JpaRepository<ColorSettings, Long> {
    List<ColorSettings> findAllByActiveTrueOrderByCategoryAscSortOrderAsc();
    Optional<ColorSettings> findByCategoryAndItemKeyAndScope(String category, String itemKey, String scope);
}
