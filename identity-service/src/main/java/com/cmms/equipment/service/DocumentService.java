package com.cmms.equipment.service;

import com.cmms.equipment.entity.EquipmentDocument;
import com.cmms.equipment.repository.EquipmentDocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import com.cmms.identity.security.UserPrincipal;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private final EquipmentDocumentRepository documentRepository;

    @Value("${storage.location:uploads/documents}")
    private String storageLocation;

    @Transactional
    public EquipmentDocument uploadDocument(Integer equipmentId, MultipartFile file) throws IOException {
        // 1. Prepare Storage Directory
        Path uploadPath = Paths.get(storageLocation);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        // 2. Generate Unique File Name
        String originalFileName = file.getOriginalFilename();
        String uniqueFileName = UUID.randomUUID().toString() + "_" + originalFileName;
        Path filePath = uploadPath.resolve(uniqueFileName);

        // 3. Save File
        Files.copy(file.getInputStream(), filePath);

        // 4. Save to Database
        EquipmentDocument document = EquipmentDocument.builder()
                .equipmentId(equipmentId)
                .documentName(originalFileName)
                .filePath(filePath.toString())
                .fileSize(file.getSize())
                .contentType(file.getContentType())
            .uploadedAt(LocalDateTime.now())
            .uploadedBy(getCurrentUploader())
                .build();
        
        return documentRepository.save(document);
    }

    @Transactional(readOnly = true)
    public List<EquipmentDocument> getDocuments(Integer equipmentId) {
        return documentRepository.findByEquipmentId(equipmentId);
    }

    @Transactional(readOnly = true)
    public EquipmentDocument getDocument(Integer documentId) {
        return documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));
    }

    @Transactional
    public void deleteDocument(Integer documentId) {
        documentRepository.deleteById(documentId);
    }

    private String getCurrentUploader() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            return "SYSTEM";
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof UserPrincipal userPrincipal) {
            Integer userId = userPrincipal.getUser().getUserId();
            return userId != null ? String.valueOf(userId) : userPrincipal.getUsername();
        }

        return authentication.getName();
    }
}
