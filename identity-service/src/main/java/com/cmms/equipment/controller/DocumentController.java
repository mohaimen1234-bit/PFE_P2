package com.cmms.equipment.controller;

import com.cmms.equipment.entity.EquipmentDocument;
import com.cmms.equipment.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/equipment")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    @PostMapping("/{equipmentId}/documents")
    @ResponseStatus(HttpStatus.CREATED)
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER')")
    public EquipmentDocument upload(@PathVariable Integer equipmentId, @RequestParam("file") MultipartFile file) throws IOException {
        return documentService.uploadDocument(equipmentId, file);
    }

    @GetMapping("/{equipmentId}/documents")
    public List<EquipmentDocument> getByEquipment(@PathVariable Integer equipmentId) {
        return documentService.getDocuments(equipmentId);
    }

    @DeleteMapping("/documents/{documentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER')")
    public void delete(@PathVariable Integer documentId) {
        documentService.deleteDocument(documentId);
    }

    @GetMapping("/documents/{documentId}/download")
    public org.springframework.http.ResponseEntity<org.springframework.core.io.Resource> downloadDocument(@PathVariable Integer documentId) throws IOException {
        EquipmentDocument doc = documentService.getDocument(documentId);

        java.nio.file.Path path = java.nio.file.Paths.get(doc.getFilePath());
        java.net.URI fileUri = path.toUri();
        org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(fileUri);

        if (!resource.exists() || !resource.isReadable()) {
            return org.springframework.http.ResponseEntity.notFound().build();
        }

        String contentType = doc.getContentType() != null ? doc.getContentType() : "application/octet-stream";

        return org.springframework.http.ResponseEntity.ok()
            .contentType(org.springframework.http.MediaType.parseMediaType(contentType))
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + doc.getDocumentName() + "\"")
                .contentLength(doc.getFileSize() != null ? doc.getFileSize() : java.nio.file.Files.size(path))
                .body(resource);
    }
}
