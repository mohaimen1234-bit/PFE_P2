package com.cmms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication(scanBasePackages = "com.cmms")
@EnableJpaAuditing
public class CmmsApplication {

    public static void main(String[] args) {
        SpringApplication.run(CmmsApplication.class, args);
    }
}
