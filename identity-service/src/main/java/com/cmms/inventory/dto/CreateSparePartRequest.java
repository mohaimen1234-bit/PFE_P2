package com.cmms.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSparePartRequest {
    @NotBlank(message = "Part name is required")
    private String name;
    
    @NotBlank(message = "SKU is required")
    private String sku;
    
    private String category;
    
    @NotNull(message = "Quantity is required")
    private Integer quantityInStock;
    
    @NotNull(message = "Minimum stock level is required")
    private Integer minStockLevel;
    
    private BigDecimal unitCost;
    private String location;
    private String supplier;
}
