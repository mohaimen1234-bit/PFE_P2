package com.cmms.equipment.service;

import com.cmms.equipment.entity.EquipmentModel;
import com.cmms.equipment.exception.ResourceNotFoundException;
import com.cmms.equipment.repository.EquipmentModelRepository;
import com.cmms.equipment.repository.EquipmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EquipmentModelService {

    private final EquipmentModelRepository modelRepository;
    private final EquipmentRepository equipmentRepository;

    @Transactional(readOnly = true)
    public List<EquipmentModel> getAll() {
        return modelRepository.findAll();
    }

    @Transactional
    public EquipmentModel create(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Model name is required");
        }
        if (modelRepository.existsByNameIgnoreCase(name.trim())) {
            throw new IllegalArgumentException("Model already exists: " + name);
        }
        EquipmentModel model = EquipmentModel.builder()
                .name(name.trim())
                .build();
        return modelRepository.save(model);
    }

    @Transactional
    public void delete(Integer id) {
        if (!modelRepository.existsById(id)) {
            throw new ResourceNotFoundException("Model not found with ID: " + id);
        }
        boolean inUse = equipmentRepository.existsByModelId(id);
        if (inUse) {
            throw new IllegalStateException("Cannot delete model while equipment is using it");
        }
        modelRepository.deleteById(id);
    }
}
