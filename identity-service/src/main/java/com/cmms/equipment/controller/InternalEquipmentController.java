package com.cmms.equipment.controller;

import com.cmms.equipment.dto.EquipmentResponse;
import com.cmms.equipment.repository.EquipmentRepository;
import io.swagger.v3.oas.annotations.Hidden;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/internal")
@RequiredArgsConstructor
@Hidden
public class InternalEquipmentController {

    private final EquipmentRepository equipmentRepository;

    @GetMapping("/equipment/{id}/exists")
    public ResponseEntity<Boolean> checkEquipmentExists(@PathVariable Integer id) {
        return ResponseEntity.ok(id != null && equipmentRepository.existsById(id));
    }

    @GetMapping("/equipment/{id}/summary")
    public ResponseEntity<EquipmentResponse> getEquipmentSummary(@PathVariable Integer id) {
        if (id == null) {
            return ResponseEntity.badRequest().build();
        }

        return equipmentRepository.findById(id)
                .map(eq -> ResponseEntity.ok(EquipmentResponse.builder()
                        .equipmentId(eq.getEquipmentId())
                        .name(eq.getName())
                        .serialNumber(eq.getSerialNumber())
                        .status(eq.getStatus().name())
                        .departmentId(eq.getDepartmentId())
                        .location(eq.getLocation())
                        .createdAt(eq.getCreatedAt())
                        .build()))
                .orElse(ResponseEntity.notFound().build());
    }
}
