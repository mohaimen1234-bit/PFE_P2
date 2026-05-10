package com.cmms.claims.controller;

import com.cmms.claims.dto.*;
import com.cmms.claims.service.ClaimPhotoService;
import com.cmms.claims.service.ClaimService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Path;
import java.util.List;

@RestController
@RequestMapping("/api/claims")
@RequiredArgsConstructor
@Tag(name = "Claims", description = "Claims workflow: create, qualify, assign, status transitions, photos, history")
@SecurityRequirement(name = "bearerAuth")
public class ClaimsController {

    private final ClaimService claimService;
    private final ClaimPhotoService claimPhotoService;

    @GetMapping
    @Operation(summary = "List claims", description = "Supports filtering via query parameters")
    public List<ClaimListItemResponse> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) Integer equipmentId,
            @RequestParam(required = false) Integer departmentId,
            @RequestParam(required = false) Integer requesterId,
            @RequestParam(required = false) Integer assignedToUserId,
            @RequestParam(required = false) String q
    ) {
        return claimService.listClaims(status, priority, equipmentId, departmentId, requesterId, assignedToUserId, q);
    }

    @GetMapping("/stats")
    @Operation(summary = "Get claims stats")
    public ClaimStatsResponse stats() {
        return claimService.getStats();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new claim")
    public ClaimResponse create(@Valid @RequestBody CreateClaimRequest request) {
        return claimService.createClaim(request);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get claim by ID")
    public ClaimResponse get(@PathVariable Integer id) {
        return claimService.getClaim(id);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update claim details")
    public ClaimResponse update(@PathVariable Integer id, @Valid @RequestBody UpdateClaimRequest request) {
        return claimService.updateClaim(id, request);
    }

    @PatchMapping("/{id}/qualify")
    @PreAuthorize("hasAnyRole('ADMIN','MAINTENANCE_MANAGER')")
    @Operation(summary = "Qualify a claim", description = "Requires ADMIN or MAINTENANCE_MANAGER")
    public ClaimResponse qualify(@PathVariable Integer id, @RequestBody ClaimQualificationRequest request) {
        return claimService.qualifyClaim(id, request);
    }

    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN','MAINTENANCE_MANAGER')")
    @Operation(summary = "Assign a claim to a technician", description = "Requires ADMIN or MAINTENANCE_MANAGER")
    public ClaimResponse assign(@PathVariable Integer id, @Valid @RequestBody ClaimAssignRequest request) {
        return claimService.assignClaim(id, request);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','MAINTENANCE_MANAGER','TECHNICIAN')")
    @Operation(summary = "Update claim status", description = "Technicians can update status only for their assigned claims")
    public ClaimResponse updateStatus(@PathVariable Integer id, @Valid @RequestBody ClaimStatusUpdateRequest request) {
        return claimService.updateStatus(id, request);
    }

    @PostMapping("/{id}/convert-to-wo")
    @PreAuthorize("hasAnyRole('ADMIN','MAINTENANCE_MANAGER')")
    @Operation(summary = "Convert a qualified claim to a corrective work order")
    public ClaimResponse convertToWorkOrder(@PathVariable Integer id) {
        return claimService.convertToWorkOrder(id);
    }

    @GetMapping("/{id}/history")
    @Operation(summary = "Get claim history", description = "Returns merged status history and audit log entries")
    public List<ClaimHistoryEntryResponse> history(@PathVariable Integer id) {
        return claimService.getHistory(id);
    }

    @GetMapping("/{id}/photos")
    @Operation(summary = "List claim photos")
    public List<ClaimPhotoResponse> listPhotos(@PathVariable Integer id) {
        return claimService.listPhotos(id);
    }

    @PostMapping(value = "/{id}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','MAINTENANCE_MANAGER','TECHNICIAN')")
    @Operation(summary = "Upload a claim photo")
    public ClaimPhotoResponse uploadPhoto(@PathVariable Integer id, @RequestPart("file") MultipartFile file) throws IOException {
        return claimPhotoService.upload(id, file);
    }

        @GetMapping("/{id}/photos/{photoId}/file")
        @Operation(summary = "Download a claim photo")
        public ResponseEntity<Resource> downloadPhoto(@PathVariable Integer id, @PathVariable Integer photoId) throws MalformedURLException {
            ClaimPhotoService.PhotoFile photoFile = claimPhotoService.loadFile(id, photoId);
            Path path = photoFile.path();
            Resource resource = new UrlResource(path.toUri());
            if (!resource.exists()) {
                return ResponseEntity.notFound().build();
            }

            String contentType = photoFile.contentType();
            MediaType mediaType = contentType == null || contentType.isBlank()
                    ? MediaType.APPLICATION_OCTET_STREAM
                    : MediaType.parseMediaType(contentType);

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .body(resource);
        }

    @DeleteMapping("/{id}/photos/{photoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','MAINTENANCE_MANAGER','TECHNICIAN')")
    @Operation(summary = "Delete a claim photo")
    public void deletePhoto(@PathVariable Integer id, @PathVariable Integer photoId) {
        claimPhotoService.delete(id, photoId);
    }
}
