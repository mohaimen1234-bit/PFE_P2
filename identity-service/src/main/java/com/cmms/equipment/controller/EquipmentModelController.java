package com.cmms.equipment.controller;

import com.cmms.equipment.entity.EquipmentModel;
import com.cmms.equipment.service.EquipmentModelService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/equipment-models")
@RequiredArgsConstructor
public class EquipmentModelController {

    private final EquipmentModelService modelService;

    @GetMapping
    public List<EquipmentModel> getAll() {
        return modelService.getAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER')")
    public EquipmentModel create(@RequestBody EquipmentModel request) {
        return modelService.create(request.getName());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER')")
    public void delete(@PathVariable Integer id) {
        modelService.delete(id);
    }
}
