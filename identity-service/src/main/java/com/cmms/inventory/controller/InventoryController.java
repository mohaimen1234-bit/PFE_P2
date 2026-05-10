package com.cmms.inventory.controller;

import com.cmms.inventory.dto.CreateSparePartRequest;
import com.cmms.inventory.dto.SparePartResponse;
import com.cmms.inventory.dto.PartUsageResponse;
import com.cmms.inventory.dto.UsePartRequest;
import com.cmms.inventory.service.InventoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
@Tag(name = "Inventory", description = "Spare parts and stock management")
@SecurityRequirement(name = "bearerAuth")
public class InventoryController {

    private final InventoryService inventoryService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER', 'TECHNICIAN', 'FINANCE_MANAGER')")
    @Operation(summary = "List spare parts")
    public List<SparePartResponse> list(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "false") boolean lowStockOnly
    ) {
        return inventoryService.list(category, q, lowStockOnly);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add a new spare part")
    public SparePartResponse create(@Valid @RequestBody CreateSparePartRequest request) {
        return inventoryService.create(request);
    }

    @PatchMapping("/{id}/stock")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER')")
    @Operation(summary = "Update total stock level for a part")
    public SparePartResponse updateStock(@PathVariable Integer id, @RequestParam Integer quantity) {
        return inventoryService.updateStock(id, quantity);
    }

    @PostMapping("/{id}/add-stock")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER')")
    @Operation(summary = "Increment stock level for a part")
    public void addStock(
            @PathVariable Integer id,
            @RequestParam Integer amount,
            @RequestParam Integer actorId,
            @RequestParam String actorName) {
        inventoryService.addStock(id, amount, actorId, actorName);
    }

    @PostMapping("/usage")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Record part usage for a work order/task")
    public PartUsageResponse usePart(@Valid @RequestBody UsePartRequest request) {
        return inventoryService.usePart(request);
    }

    @GetMapping("/usage/work-order/{woId}")
    @Operation(summary = "Get part usages for a work order")
    public List<PartUsageResponse> getUsages(@PathVariable Integer woId) {
        return inventoryService.getUsagesForWorkOrder(woId);
    }
}
