package app.navigo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class NavigoApplication {
    public static void main(String[] args) {
        SpringApplication.run(NavigoApplication.class, args);
    }
}
