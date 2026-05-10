package com.cmms.maintenance.controller;

import com.cmms.maintenance.entity.WoChecklist;
import com.cmms.maintenance.repository.WoChecklistRepository;
import com.cmms.claims.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/work-orders/{woId}/checklist")
@RequiredArgsConstructor
public class WoChecklistController {

    private final WoChecklistRepository checklistRepository;

    @GetMapping
    public ResponseEntity<WoChecklist> getChecklist(@PathVariable Integer woId) {
        return ResponseEntity.ok(checklistRepository.findByWoId(woId)
                .orElseThrow(() -> new ResourceNotFoundException("Checklist not found for WO " + woId)));
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER', 'TECHNICIAN')")
    public ResponseEntity<WoChecklist> updateChecklist(@PathVariable Integer woId, @RequestBody String itemsJson) {
        WoChecklist checklist = checklistRepository.findByWoId(woId)
                .orElseThrow(() -> new ResourceNotFoundException("Checklist not found for WO " + woId));

        checklist.setItemsJson(itemsJson);
        checklist.setUpdatedAt(LocalDateTime.now());
        
        // If all items are checked (handled by frontend logic usually, but we update timestamp here)
        // checklist.setCompletedAt(null); // Optional: logic to detect fully completed

        return ResponseEntity.ok(checklistRepository.save(checklist));
    }
}
