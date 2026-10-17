package app.navigo;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class ApiIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private String register(String email) throws Exception {
        return register(email, "N5");
    }

    private String register(String email, String level) throws Exception {
        String body = "{\"email\":\"" + email + "\",\"password\":\"correct-horse\",\"displayName\":\"Taro\",\"currentLevel\":\"" + level + "\"}";
        String res = mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.accessToken", notNullValue()))
                .andReturn().getResponse().getContentAsString();
        return json.readTree(res).get("accessToken").asText();
    }

    private static String email() {
        return UUID.randomUUID() + "@example.com";
    }

    @Test
    void dashboardRequiresAuthentication() throws Exception {
        mvc.perform(get("/api/v1/dashboard")).andExpect(status().isUnauthorized());
    }

    @Test
    void registerValidatesAndRejectsDuplicates() throws Exception {
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"bad\",\"password\":\"x\",\"displayName\":\"\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.email", notNullValue()));
        String e = email();
        register(e);
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + e.toUpperCase() + "\",\"password\":\"correct-horse\",\"displayName\":\"T\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void loginChecksPassword() throws Exception {
        String e = email();
        register(e);
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + e + "\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + e + "\",\"password\":\"correct-horse\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.user.email", is(e)));
    }

    @Test
    void newLearnerDashboardIsHonestlyEmpty() throws Exception {
        String token = register(email());
        mvc.perform(get("/api/v1/dashboard").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.level.level", is("N5")))
                .andExpect(jsonPath("$.level.source", is("SELF_REPORTED")))
                .andExpect(jsonPath("$.streakDays", is(0)))
                .andExpect(jsonPath("$.vocabularyRetention").doesNotExist())
                .andExpect(jsonPath("$.objectives", hasSize(3)))
                .andExpect(jsonPath("$.weekly.days", hasSize(7)))
                .andExpect(jsonPath("$.recommendedLesson.slug", is("n5-greetings-vocab")));
    }

    @Test
    void selfReportedLevelIsPersisted() throws Exception {
        String token = register(email(), "N3");
        mvc.perform(get("/api/v1/dashboard").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.level.level", is("N3")));
    }

    @Test
    void completingASessionUpdatesStreakObjectivesAndRecommendation() throws Exception {
        String token = register(email());
        String auth = "Bearer " + token;
        String lessons = mvc.perform(get("/api/v1/lessons").header("Authorization", auth))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String grammarId = null;
        for (JsonNode l : json.readTree(lessons)) {
            if (l.get("slug").asText().equals("n5-wa-desu")) {
                grammarId = l.get("id").asText();
            }
        }
        String started = mvc.perform(post("/api/v1/study-sessions").header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"lessonId\":\"" + grammarId + "\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String sessionId = json.readTree(started).get("id").asText();
        mvc.perform(post("/api/v1/study-sessions/" + sessionId + "/complete").header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"durationMinutes\":12}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.durationMinutes", is(12)));
        mvc.perform(post("/api/v1/study-sessions/" + sessionId + "/complete").header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"durationMinutes\":12}"))
                .andExpect(status().isConflict());

        mvc.perform(get("/api/v1/dashboard").header("Authorization", auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.streakDays", is(1)))
                .andExpect(jsonPath("$.weekly.minutes", is(12)))
                .andExpect(jsonPath("$.objectives[?(@.type=='GRAMMAR_LESSON')].completed", org.hamcrest.Matchers.contains(1)))
                .andExpect(jsonPath("$.recommendedLesson.slug", is("n5-greetings-vocab")));

        // Another learner cannot touch this session.
        String other = "Bearer " + register(email());
        mvc.perform(post("/api/v1/study-sessions/" + sessionId + "/complete").header("Authorization", other)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"durationMinutes\":1}"))
                .andExpect(status().isNotFound());
    }
}
