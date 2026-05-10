package com.cmms.equipment.service;

import com.cmms.equipment.entity.EquipmentCategory;
import com.cmms.equipment.exception.ResourceNotFoundException;
import com.cmms.equipment.repository.EquipmentCategoryRepository;
import com.cmms.equipment.repository.EquipmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EquipmentCategoryService {

    private final EquipmentCategoryRepository categoryRepository;
    private final EquipmentRepository equipmentRepository;

    @Transactional(readOnly = true)
    public List<EquipmentCategory> getAll() {
        return categoryRepository.findAll();
    }

    @Transactional
    public EquipmentCategory create(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Category name is required");
        }
        if (categoryRepository.existsByNameIgnoreCase(name.trim())) {
            throw new IllegalArgumentException("Category already exists: " + name);
        }
        EquipmentCategory category = EquipmentCategory.builder()
                .name(name.trim())
                .build();
        return categoryRepository.save(category);
    }

    @Transactional
    public void delete(Integer id) {
        if (!categoryRepository.existsById(id)) {
            throw new ResourceNotFoundException("Category not found with ID: " + id);
        }
        boolean inUse = equipmentRepository.existsByCategoryId(id);
        if (inUse) {
            throw new IllegalStateException("Cannot delete category while equipment is using it");
        }
        categoryRepository.deleteById(id);
    }
}
