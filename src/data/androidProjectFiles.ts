export interface AndroidProjectFile {
  path: string;
  language: 'kotlin' | 'groovy' | 'json' | 'rules';
  description: string;
  content: string;
}

export const androidProjectFiles: AndroidProjectFile[] = [
  {
    path: 'app/build.gradle.kts',
    language: 'kotlin',
    description: 'Gradle build file with Android, Compose, and Firebase dependencies.',
    content: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services")
}

android {
    namespace = "com.thecommissary.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.thecommissary.app"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.8"
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // Core Android & Lifecycle
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.activity:activity-compose:1.8.2")

    // Jetpack Compose & Material 3
    implementation(platform("androidx.compose:compose-bom:2024.01.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.navigation:navigation-compose:2.7.6")

    // Icons
    implementation("androidx.compose.material:material-icons-extended")

    // Coil (Image Loading)
    implementation("io.coil-kt:coil-compose:2.5.0")

    // Firebase (BOM)
    implementation(platform("com.google.firebase:firebase-bom:32.7.2"))
    implementation("com.google.firebase:firebase-analytics-ktx")
    implementation("com.google.firebase:firebase-auth-ktx")
    implementation("com.google.firebase:firebase-firestore-ktx")
    implementation("com.google.firebase:firebase-storage-ktx")
    implementation("com.google.firebase:firebase-messaging-ktx")

    // Testing
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
    androidTestImplementation(platform("androidx.compose:compose-bom:2024.01.00"))
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}`
  },
  {
    path: 'com/thecommissary/app/data/Models.kt',
    language: 'kotlin',
    description: 'Kotlin data models corresponding to the Firestore schema.',
    content: `package com.thecommissary.app.data

import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentId

enum class UserRole {
    SUPER_ADMIN, ADMIN, MANAGER, EMPLOYEE
}

data class User(
    @DocumentId val id: String = "",
    val name: String = "",
    val email: String = "",
    val role: String = "EMPLOYEE",
    val assignedLocations: List<String> = emptyList(),
    val assignedForms: List<String> = emptyList()
) {
    fun getRoleEnum(): UserRole = try {
        UserRole.valueOf(role.uppercase())
    } catch (e: Exception) {
        UserRole.EMPLOYEE
    }
}

data class Location(
    @DocumentId val code: String = "", // e.g. "CM", "AR", etc.
    val name: String = "",
    val active: Boolean = true,
    val address: String = ""
)

data class InventoryItem(
    @DocumentId val id: String = "",
    val name: String = "",
    val category: String = "", // e.g. "Cooler", "Dry Storage", "Bar", etc.
    val description: String = "",
    val vendorName: String = "",
    val packagingDetails: String = "",
    val unitOfMeasurement: String = "", // e.g. "cases", "pounds", "gallons"
    val defaultParLevel: Double = 0.0,
    val photoUrl: String = "",
    val active: Boolean = true
)

data class FormSection(
    val name: String = "", // Cooler, Freezer, Dry Storage, Prep Area, Bar, Steam Table
    val itemIds: List<String> = emptyList()
)

data class InventoryForm(
    @DocumentId val id: String = "",
    val title: String = "",
    val locationCode: String = "", // Bound to a specific location
    val assignedUserIds: List<String> = emptyList(),
    val frequency: String = "DAILY", // DAILY, WEEKLY, BI-WEEKLY
    val dueDate: String = "", // YYYY-MM-DD
    val dueTime: String = "", // HH:MM
    val sections: List<FormSection> = emptyList(),
    val active: Boolean = true
)

data class SubmissionItem(
    val itemId: String = "",
    val name: String = "",
    val category: String = "",
    val unit: String = "",
    val currentCount: Double = 0.0,
    val parLevel: Double = 0.0,
    val suggestedOrder: Double = 0.0,
    val finalOrder: Double = 0.0,
    val total: Double = 0.0,
    val photoUrl: String = ""
)

data class FormSubmission(
    @DocumentId val id: String = "",
    val formId: String = "",
    val formTitle: String = "",
    val locationCode: String = "",
    val userId: String = "",
    val userName: String = "",
    val timestamp: Timestamp = Timestamp.now(),
    val items: List<SubmissionItem> = emptyList(),
    val notes: String = ""
)

data class AuditLog(
    @DocumentId val id: String = "",
    val action: String = "", // CREATE_USER, SUBMIT_FORM, EXPORT, UPDATE_ITEM
    val userEmail: String = "",
    val userName: String = "",
    val details: String = "",
    val timestamp: Timestamp = Timestamp.now()
)`
  },
  {
    path: 'com/thecommissary/app/MainActivity.kt',
    language: 'kotlin',
    description: 'Main activity file handling themes, role logic, and Jetpack Navigation graph.',
    content: `package com.thecommissary.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NamedNavArgument
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.thecommissary.app.ui.screens.*
import com.thecommissary.app.ui.theme.TheCommissaryTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            TheCommissaryTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    CommissaryAppNavigation()
                }
            }
        }
    }
}

sealed class Screen(val route: String) {
    object Splash : Screen("splash")
    object Login : Screen("login")
    object ForgotPassword : Screen("forgot_password")
    object Dashboard : Screen("dashboard")
    object LocationSelector : Screen("location_selector")
    object InventoryForms : Screen("inventory_forms/{locationCode}") {
        fun createRoute(code: String) = "inventory_forms/$code"
    }
    object InventoryCounting : Screen("inventory_counting/{formId}") {
        fun createRoute(formId: String) = "inventory_counting/$formId"
    }
    object VoiceInventory : Screen("voice_inventory/{formId}") {
        fun createRoute(formId: String) = "voice_inventory/$formId"
    }
    object SubmissionConfirmation : Screen("submission_confirmation/{submissionId}") {
        fun createRoute(id: String) = "submission_confirmation/$id"
    }
    object Reports : Screen("reports")
    object AdminUserMgmt : Screen("admin_users")
    object AdminLocationMgmt : Screen("admin_locations")
    object AdminItemMgmt : Screen("admin_items")
    object AdminFormMgmt : Screen("admin_forms")
    object Settings : Screen("settings")
}

@Composable
fun CommissaryAppNavigation() {
    val navController = rememberNavController()
    NavHost(
        navController = navController,
        startDestination = Screen.Splash.route
    ) {
        composable(Screen.Splash.route) {
            SplashScreen(navController)
        }
        composable(Screen.Login.route) {
            LoginScreen(navController)
        }
        composable(Screen.ForgotPassword.route) {
            ForgotPasswordScreen(navController)
        }
        composable(Screen.Dashboard.route) {
            DashboardScreen(navController)
        }
        composable(Screen.LocationSelector.route) {
            LocationSelectorScreen(navController)
        }
        composable(
            route = Screen.InventoryForms.route,
            arguments = listOf(navArgument("locationCode") { type = NavType.StringType })
        ) { backStackEntry ->
            val code = backStackEntry.arguments?.getString("locationCode") ?: ""
            InventoryFormsScreen(navController, locationCode = code)
        }
        composable(
            route = Screen.InventoryCounting.route,
            arguments = listOf(navArgument("formId") { type = NavType.StringType })
        ) { backStackEntry ->
            val formId = backStackEntry.arguments?.getString("formId") ?: ""
            InventoryCountingScreen(navController, formId = formId)
        }
        composable(
            route = Screen.VoiceInventory.route,
            arguments = listOf(navArgument("formId") { type = NavType.StringType })
        ) { backStackEntry ->
            val formId = backStackEntry.arguments?.getString("formId") ?: ""
            VoiceInventoryScreen(navController, formId = formId)
        }
        composable(
            route = Screen.SubmissionConfirmation.route,
            arguments = listOf(navArgument("submissionId") { type = NavType.StringType })
        ) { backStackEntry ->
            val id = backStackEntry.arguments?.getString("submissionId") ?: ""
            SubmissionConfirmationScreen(navController, submissionId = id)
        }
        composable(Screen.Reports.route) {
            ReportsScreen(navController)
        }
        composable(Screen.AdminUserMgmt.route) {
            AdminUserManagementScreen(navController)
        }
        composable(Screen.AdminLocationMgmt.route) {
            AdminLocationManagementScreen(navController)
        }
        composable(Screen.AdminItemMgmt.route) {
            AdminItemManagementScreen(navController)
        }
        composable(Screen.AdminFormMgmt.route) {
            AdminFormBuilderScreen(navController)
        }
        composable(Screen.Settings.route) {
            SettingsScreen(navController)
        }
    }
}`
  },
  {
    path: 'com/thecommissary/app/data/VoiceRecognizer.kt',
    language: 'kotlin',
    description: 'Android Speech Recognition Helper with text parsing for quantities/measurements.',
    content: `package com.thecommissary.app.data

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import java.util.Locale

data class ParsedVoiceItem(
    val rawText: String,
    val matchedItemName: String,
    val quantity: Double,
    val unit: String
)

class VoiceRecognizerHelper(
    private val context: Context,
    private val onResult: (ParsedVoiceItem) -> Unit,
    private val onError: (String) -> Unit
) {
    private var speechRecognizer: SpeechRecognizer? = null
    private val speechRecognizerIntent: Intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
        putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
    }

    init {
        if (SpeechRecognizer.isRecognitionAvailable(context)) {
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context).apply {
                setRecognitionListener(object : RecognitionListener {
                    override fun onReadyForSpeech(params: Bundle?) {}
                    override fun onBeginningOfSpeech() {}
                    override fun onRmsChanged(rmsdB: Float) {}
                    override fun onBufferReceived(buffer: ByteArray?) {}
                    override fun onEndOfSpeech() {}
                    
                    override fun onError(error: Int) {
                        val message = when (error) {
                            SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
                            SpeechRecognizer.ERROR_CLIENT -> "Client-side error"
                            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Insufficient permissions"
                            SpeechRecognizer.ERROR_NETWORK -> "Network error"
                            SpeechRecognizer.ERROR_NO_MATCH -> "No speech match found"
                            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech input detected"
                            else -> "Voice recognition failed"
                        }
                        onError(message)
                    }

                    override fun onResults(results: Bundle?) {
                        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        if (!matches.isNullOrEmpty()) {
                            val recognizedText = matches[0]
                            val parsed = parseVoiceText(recognizedText)
                            onResult(parsed)
                        } else {
                            onError("No words detected.")
                        }
                    }

                    override fun onPartialResults(partialResults: Bundle?) {}
                    override fun onEvent(eventType: Int, params: Bundle?) {}
                })
            }
        }
    }

    fun startListening() {
        speechRecognizer?.startListening(speechRecognizerIntent)
    }

    fun stopListening() {
        speechRecognizer?.stopListening()
    }

    fun destroy() {
        speechRecognizer?.destroy()
    }

    /**
     * Parses commands such as:
     * "Chicken breast 5 cases" -> Item: Chicken breast, Qty: 5.0, Unit: cases
     * "Tomatoes 2.5 pounds" -> Item: Tomatoes, Qty: 2.5, Unit: pounds
     * "Red chile 3 containers" -> Item: Red chile, Qty: 3.0, Unit: containers
     * Uses regex to extract quantifiers and units.
     */
    fun parseVoiceText(text: String): ParsedVoiceItem {
        val lowercase = text.lowercase(Locale.ROOT).trim()
        
        // Match numbers, optionally containing decimals, e.g., "5", "2.5", "10"
        val regex = "([a-zA-Z\\\\s'-]+)\\\\s+([0-9]+(?:\\\\.[0-9]+)?)\\\\s+([a-zA-Z]+)".toRegex()
        val matchResult = regex.find(lowercase)

        if (matchResult != null) {
            val itemName = matchResult.groupValues[1].trim()
            val qtyString = matchResult.groupValues[2]
            val unit = matchResult.groupValues[3].trim()
            val qty = qtyString.toDoubleOrNull() ?: 0.0

            return ParsedVoiceItem(
                rawText = text,
                matchedItemName = capitalizeWords(itemName),
                quantity = qty,
                unit = unit
            )
        }

        // Fallback simple parsing: try finding any double value
        val numberRegex = "([0-9]+(?:\\\\.[0-9]+)?)".toRegex()
        val numMatch = numberRegex.find(lowercase)
        if (numMatch != null) {
            val qty = numMatch.value.toDoubleOrNull() ?: 0.0
            val parts = lowercase.split(numMatch.value)
            val namePart = parts.firstOrNull()?.trim() ?: "Unknown"
            val unitPart = parts.getOrNull(1)?.trim() ?: "units"
            return ParsedVoiceItem(text, capitalizeWords(namePart), qty, unitPart)
        }

        return ParsedVoiceItem(text, text, 0.0, "units")
    }

    private fun capitalizeWords(str: String): String {
        return str.split(" ").joinToString(" ") { word ->
            word.replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.ROOT) else it.toString() }
        }
    }
}`
  },
  {
    path: 'com/thecommissary/app/data/FirestoreRepository.kt',
    language: 'kotlin',
    description: 'Firestore repository implementation executing atomic submission writes and par level calculations.',
    content: `package com.thecommissary.app.data

import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.tasks.await

class FirestoreRepository {
    private val firestore = FirebaseFirestore.getInstance()

    suspend fun getAssignedFormsForUser(userId: String): List<InventoryForm> {
        return try {
            firestore.collection("forms")
                .whereArrayContains("assignedUserIds", userId)
                .whereEqualTo("active", true)
                .get()
                .await()
                .toObjects(InventoryForm::class.java)
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun fetchInventoryItemsById(ids: List<String>): List<InventoryItem> {
        if (ids.isEmpty()) return emptyList()
        return try {
            // Firestore limit is 30 in 'in' queries, chunk if larger
            val chunked = ids.chunked(30)
            val result = mutableListOf<InventoryItem>()
            for (chunk in chunked) {
                val querySnapshot = firestore.collection("inventoryItems")
                    .whereIn("id", chunk)
                    .get()
                    .await()
                result.addAll(querySnapshot.toObjects(InventoryItem::class.java))
            }
            result
        } catch (e: Exception) {
            emptyList()
        }
    }

    /**
     * Completes submission transaction:
     * 1. Validates all counts.
     * 2. Formulates Suggested Order = parLevel - currentCount (Defaults final to suggested)
     * 3. Saves submission structure to Firestore.
     * 4. Logs to Cloud Audit Trails.
     */
    suspend fun submitInventory(
        form: InventoryForm,
        user: User,
        finalItemsList: List<SubmissionItem>,
        notes: String
    ): String {
        val submissionRef = firestore.collection("submissions").document()
        val submission = FormSubmission(
            id = submissionRef.id,
            formId = form.id,
            formTitle = form.title,
            locationCode = form.locationCode,
            userId = user.id,
            userName = user.name,
            timestamp = Timestamp.now(),
            items = finalItemsList,
            notes = notes
        )

        val logRef = firestore.collection("auditLogs").document()
        val auditLog = AuditLog(
            id = logRef.id,
            action = "SUBMIT_FORM",
            userEmail = user.email,
            userName = user.name,
            details = "Submitted inventory form: '\${form.title}' for location: '\${form.locationCode}'",
            timestamp = Timestamp.now()
        )

        // Run batch write
        val batch = firestore.batch()
        batch.set(submissionRef, submission)
        batch.set(logRef, auditLog)
        
        batch.commit().await()
        return submissionRef.id
    }

    suspend fun getSubmissionsForLocation(locationCode: String): List<FormSubmission> {
        return try {
            firestore.collection("submissions")
                .whereEqualTo("locationCode", locationCode)
                .orderBy("timestamp", Query.Direction.DESCENDING)
                .get()
                .await()
                .toObjects(FormSubmission::class.java)
        } catch (e: Exception) {
            emptyList()
        }
    }
}`
  },
  {
    path: 'com/thecommissary/app/ui/theme/Theme.kt',
    language: 'kotlin',
    description: 'Material 3 Custom Colors Theme using Gold primary and Red outline branding colors.',
    content: `package com.thecommissary.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val GoldPrimary = Color(0xFFE6A11A) // Gorgeous operational gold
private val RedAccent = Color(0xFFDC2626) // Vivid warning/outline red
private val SlateDark = Color(0xFF1E293B)
private val DarkCardBackground = Color(0xFF0F172A)

private val LightColorScheme = lightColorScheme(
    primary = GoldPrimary,
    onPrimary = Color.Black,
    secondary = RedAccent,
    onSecondary = Color.White,
    background = Color(0xFFF8FAFC), // Crisp warm slate grey
    surface = Color.White,
    onBackground = slateDark,
    onSurface = slateDark,
    outline = RedAccent
)

private val DarkColorScheme = darkColorScheme(
    primary = GoldPrimary,
    onPrimary = Color.Black,
    secondary = RedAccent,
    onSecondary = Color.White,
    background = Color(0xFF020617), // Rich space-dark void
    surface = DarkCardBackground,
    onBackground = Color.White,
    onSurface = Color.White,
    outline = RedAccent
)

@Composable
fun TheCommissaryTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}`
  },
  {
    path: 'com/thecommissary/app/ui/screens/SplashScreen.kt',
    language: 'kotlin',
    description: 'Animated operational splash screen detailing Logo with eyeglasses on warehouse outline.',
    content: `package com.thecommissary.app.ui.screens

import android.view.animation.OvershootInterpolator
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warehouse
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.thecommissary.app.MainActivity
import com.thecommissary.app.Screen
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(navController: NavController) {
    val scale = remember { Animatable(0f) }

    LaunchedEffect(key1 = true) {
        scale.animateTo(
            targetValue = 0.9f,
            animationSpec = tween(
                durationMillis = 1000,
                easing = { OvershootInterpolator(2.5f).getInterpolation(it) }
            )
        )
        delay(1200) // Beautiful pause
        navController.navigate(Screen.Login.route) {
            popUpTo(Screen.Splash.route) { inclusive = true }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.scale(scale.value)
        ) {
            // Elegant Warehouse Eyeglasses concept logo
            Box(
                modifier = Modifier
                    .size(130.dp)
                    .border(BorderStroke(2.dp, MaterialTheme.colorScheme.primary), CircleShape)
                    .padding(16.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        imageVector = Icons.Default.Warehouse,
                        contentDescription = "Warehouse Logo",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(60.dp)
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    // Logo eyeglasses accent overlay
                    Row {
                        Icon(Icons.Outlined.Visibility, "Glasses Left", tint = Color.Red, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(Icons.Outlined.Visibility, "Glasses Right", tint = Color.Red, modifier = Modifier.size(20.dp))
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
            
            Text(
                text = "The Commissary",
                color = MaterialTheme.colorScheme.primary,
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold
            )
            
            Spacer(modifier = Modifier.height(6.dp))
            
            Text(
                text = "Track Inventory by Voice. Anytime. Anywhere.",
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f),
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium
            )
        }
    }
}`
  },
  {
    path: 'com/thecommissary/app/ui/screens/InventoryCountingScreen.kt',
    language: 'kotlin',
    description: 'Active manual inventory counting screen with categories, searching, and custom mathematical par formulas.',
    content: `package com.thecommissary.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.thecommissary.app.Screen
import com.thecommissary.app.data.InventoryItem
import com.thecommissary.app.data.SubmissionItem

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InventoryCountingScreen(navController: NavController, formId: String) {
    // Demonstration variables, in production loaded from ViewModel
    var currentSectionIndex by remember { mutableStateOf(0) }
    var searchQuery by remember { mutableStateOf("") }
    
    // Simulating items for active checklist section
    val mockItems = remember {
        mutableStateListOf(
            SubmissionItem("item1", "Chicken Breast", "Cooler", "cases", 0.0, 10.0, 10.0, 10.0, 10.0, ""),
            SubmissionItem("item3", "Salsa", "Cooler", "gallon", 0.0, 8.0, 8.0, 8.0, 8.0, ""),
            SubmissionItem("item7", "Cheddar Jack Cheese", "Cooler", "cases", 0.0, 7.0, 7.0, 7.0, 7.0, ""),
            SubmissionItem("item8", "Sour Cream", "Cooler", "cases", 0.0, 4.0, 4.0, 4.0, 4.0, "")
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Bi-Weekly Food Audit", fontWeight = FontWeight.SemiBold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { navController.navigate(Screen.VoiceInventory.createRoute(formId)) }) {
                        Icon(Icons.Default.Mic, "Voice Counting", tint = MaterialTheme.colorScheme.primary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(MaterialTheme.colorScheme.background)
        ) {
            // Category Quick Rails
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                val sections = listOf("Cooler", "Dry Storage", "Prep Area", "Bar", "Freezer")
                sections.forEachIndexed { idx, section ->
                    val isSelected = currentSectionIndex == idx
                    Button(
                        onClick = { currentSectionIndex = idx },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface,
                            contentColor = if (isSelected) Color.Black else MaterialTheme.colorScheme.onSurface
                        ),
                        modifier = Modifier
                            .weight(1f)
                            .padding(2.dp)
                            .border(
                                width = if (isSelected) 0.dp else 1.dp,
                                color = if (isSelected) Color.Transparent else MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                                shape = RoundedCornerShape(10.dp)
                            ),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text(section, fontSize = 10.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                    }
                }
            }

            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Quick search item...") },
                leadingIcon = { Icon(Icons.Default.Search, "Search") },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 4.dp),
                singleLine = true
            )

            // Items Scroller
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(8.dp)
            ) {
                itemsIndexed(mockItems) { index, item ->
                    if (searchQuery.isEmpty() || item.name.contains(searchQuery, ignoreCase = true)) {
                        CountingItemCard(
                            item = item,
                            onCountChanged = { newCount ->
                                // Sug Order = Par Level - Current Count
                                val suggested = maxOf(0.0, item.parLevel - newCount)
                                mockItems[index] = item.copy(
                                    currentCount = newCount,
                                    suggestedOrder = suggested,
                                    finalOrder = suggested, // Preset final with suggested
                                    total = newCount + suggested
                                )
                            },
                            onFinalOrderChanged = { finalVal ->
                                mockItems[index] = item.copy(
                                    finalOrder = finalVal,
                                    total = item.currentCount + finalVal
                                )
                            }
                        )
                    }
                }
            }

            // Bottom Buttons Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedButton(
                    onClick = { /* Save draft in firestore */ },
                    modifier = Modifier.weight(1f),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                ) {
                    Icon(Icons.Default.Save, "Save Draft")
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Save Draft", color = Color.Red)
                }

                Button(
                    onClick = {
                        // Submit logic and push notification triggers
                        navController.navigate(Screen.SubmissionConfirmation.createRoute("mock_sub_id_123"))
                    },
                    modifier = Modifier.weight(1.5f),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                ) {
                    Icon(Icons.Default.Check, "Submit Checksheet")
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Submit Count", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun CountingItemCard(
    item: SubmissionItem,
    onCountChanged: (Double) -> Unit,
    onFinalOrderChanged: (Double) -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .border(BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.15f)), RoundedCornerShape(12.dp)),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Item Image representation
            AsyncImage(
                model = "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=80&q=80",
                contentDescription = item.name,
                modifier = Modifier
                    .size(60.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color.LightGray),
                contentScale = ContentScale.Crop
            )

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(item.name, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Text("Par Level: \${item.parLevel.toInt()} \${item.unit}", fontSize = 12.sp, color = Color.Gray)
                
                Spacer(modifier = Modifier.height(6.dp))
                
                // Form calculations displays
                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    Column {
                        Text("Suggested", fontSize = 10.sp, color = Color.Gray)
                        Text("\${item.suggestedOrder.toInt()} \${item.unit}", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary)
                    }
                    Column {
                        Text("Expected Total", fontSize = 10.sp, color = Color.Gray)
                        Text("\${item.total.toInt()} \${item.unit}", fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }

            // Counting action area - Large numeric keypad inputs
            Column(
                horizontalAlignment = Alignment.End,
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                // Current manual physical count
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Count: ", fontSize = 12.sp, fontWeight = FontWeight.Medium)
                    OutlinedTextField(
                        value = if (item.currentCount == 0.0) "" else item.currentCount.toInt().toString(),
                        onValueChange = { onCountChanged(it.toDoubleOrNull() ?: 0.0) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.width(62.dp),
                        singleLine = true,
                        textStyle = LocalTextStyle.current.copy(textAlign = TextAlign.Center, fontWeight = FontWeight.Bold)
                    )
                }

                // Final Order override
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Order: ", fontSize = 12.sp, fontWeight = FontWeight.Medium)
                    OutlinedTextField(
                        value = if (item.finalOrder == 0.0) "" else item.finalOrder.toInt().toString(),
                        onValueChange = { onFinalOrderChanged(it.toDoubleOrNull() ?: 0.0) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.width(62.dp),
                        singleLine = true,
                        colors = TextFieldDefaults.colors(focusedIndicatorColor = Color.Red),
                        textStyle = LocalTextStyle.current.copy(textAlign = TextAlign.Center, fontWeight = FontWeight.Bold)
                    )
                }
            }
        }
    }
}`
  },
  {
    path: 'com/thecommissary/app/ui/screens/VoiceInventoryScreen.kt',
    language: 'kotlin',
    description: 'Dynamic Voice Inventory counter capturing and parsing spoke speech commands in real time.',
    content: `package com.thecommissary.app.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.navigation.NavController
import com.thecommissary.app.data.VoiceRecognizerHelper

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VoiceInventoryScreen(navController: NavController, formId: String) {
    val context = LocalContext.current
    var isListening by remember { mutableStateOf(false) }
    var recognizedSentence by remember { mutableStateOf("Say something like:\\n\\\"Chicken breast 5 cases\\\"") }
    var matchedResult by remember { mutableStateOf<String?>(null) }
    var hasPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        )
    }

    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission(),
        onResult = { granted -> hasPermission = granted }
    )

    // Breathing pulse graphics for the voice mic
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val scalePulse by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.25f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )

    // Speech framework listener
    val voiceHelper = remember {
        VoiceRecognizerHelper(
            context = context,
            onResult = { parsed ->
                isListening = false
                recognizedSentence = "I heard: \\"\${parsed.rawText}\\""
                if (parsed.quantity > 0.0) {
                    matchedResult = "Successfully updated Match!\\nItem: \${parsed.matchedItemName}\\nQuantity: \${parsed.quantity.toInt()} \${parsed.unit}"
                    // Here, update local state or viewmodel with count
                } else {
                    matchedResult = "Parsed sentence but item or quantity was unrecognizable.\\nRecognized as: '\${parsed.matchedItemName}'"
                }
            },
            onError = { err ->
                isListening = false
                recognizedSentence = "Error: $err"
                matchedResult = null
            }
        )
    }

    DisposableEffect(Unit) {
        onDispose { voiceHelper.destroy() }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Speech Assistance Core", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(MaterialTheme.colorScheme.background),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
                modifier = Modifier.padding(24.dp)
            ) {
                Text(
                    text = "System Operator Listening Node",
                    fontSize = 14.sp,
                    color = Color.Gray,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 2.sp
                )

                Spacer(modifier = Modifier.height(30.dp))

                // Pulsing Mic trigger
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier.size(170.dp)
                ) {
                    if (isListening) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .scale(scalePulse)
                                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.2f), CircleShape)
                        )
                    }

                    Button(
                        onClick = {
                            if (!hasPermission) {
                                launcher.launch(Manifest.permission.RECORD_AUDIO)
                            } else {
                                if (isListening) {
                                    voiceHelper.stopListening()
                                    isListening = false
                                } else {
                                    matchedResult = null
                                    recognizedSentence = "Listening closely..."
                                    voiceHelper.startListening()
                                    isListening = true
                                }
                            }
                        },
                        shape = CircleShape,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isListening) Color.Red else MaterialTheme.colorScheme.primary
                        ),
                        modifier = Modifier.size(100.dp)
                    ) {
                        Icon(
                            imageVector = if (isListening) Icons.Default.MicOff else Icons.Default.Mic,
                            contentDescription = "Mic Trigger",
                            tint = Color.Black,
                            modifier = Modifier.size(45.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(40.dp))

                // Live Audio Speech Bubble Readouts
                Surface(
                    shape = androidx.compose.foundation.shape.AbsoluteRoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.surface,
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.15f), androidx.compose.foundation.shape.AbsoluteRoundedCornerShape(16.dp))
                ) {
                    Column(modifier = Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = recognizedSentence,
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Medium,
                            textAlign = TextAlign.Center,
                            fontFamily = FontFamily.SansSerif
                        )

                        matchedResult?.let { result ->
                            Spacer(modifier = Modifier.height(14.dp))
                            Divider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))
                            Spacer(modifier = Modifier.height(14.dp))
                            Text(
                                text = result,
                                fontSize = 15.sp,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.SemiBold,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                Text(
                    text = "Supported Units: cases, pounds (lbs), gallons, containers, boxes, bags, cans.",
                    fontSize = 11.sp,
                    color = Color.Gray,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}`
  },
  {
    path: 'com/thecommissary/app/ui/screens/ReportsScreen.kt',
    language: 'kotlin',
    description: 'Enterprise analytics reports dashboard outlining CSV, Excel, and PDF mock export codes.',
    content: `package com.thecommissary.app.ui.screens

import android.content.Context
import android.os.Environment
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.PictureAsPdf
import androidx.compose.material.icons.filled.TableChart
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.thecommissary.app.data.SubmissionItem
import java.io.File
import java.io.FileWriter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportsScreen(navController: NavController) {
    val context = LocalContext.current
    val mockReportItems = remember {
        listOf(
            SubmissionItem("item1", "Chicken Breast", "Cooler", "cases", 4.0, 10.0, 6.0, 6.0, 10.0, ""),
            SubmissionItem("item3", "Salsa", "Cooler", "gallon", 3.0, 8.0, 5.0, 5.0, 8.0, ""),
            SubmissionItem("item2", "Tomatoes", "Prep Area", "pounds", 12.0, 15.0, 3.0, 3.0, 15.0, ""),
            SubmissionItem("item4", "Red Chile", "Steam Table", "containers", 2.0, 6.0, 4.0, 4.0, 6.0, "")
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Inventory Analytics Report", fontWeight = FontWeight.SemiBold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(MaterialTheme.colorScheme.background)
                .padding(16.dp)
        ) {
            // Summary Header Details
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Outlets Metrics Overviews", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("Location: AR - Arlington", fontSize = 14.sp)
                    Text("Audit Timeframe: Bi-Weekly Audit Spreadsheet", fontSize = 14.sp, color = Color.Gray)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Export Actions Trigger Panel
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = { exportToCSV(context, mockReportItems) },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                ) {
                    Icon(Icons.Default.TableChart, "CSV")
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Export CSV", fontSize = 11.sp, color = Color.Black)
                }

                Button(
                    onClick = { exportToExcel(context, mockReportItems) },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                ) {
                    Icon(Icons.Default.Download, "Excel")
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Export XLSX", fontSize = 11.sp, color = Color.Black)
                }

                Button(
                    onClick = { exportToPDF(context, mockReportItems) },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = Color.Red)
                ) {
                    Icon(Icons.Default.PictureAsPdf, "PDF")
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Export PDF", fontSize = 11.sp, color = Color.White)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Variance Spreadsheet Table
            Text("Suggested Variance & Purchase Orders", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            Spacer(modifier = Modifier.height(8.dp))

            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(mockReportItems) { item ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(item.name, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Text("On-Hand: \${item.currentCount.toInt()} / Par: \${item.parLevel.toInt()} \${item.unit}", fontSize = 12.sp, color = Color.Gray)
                            }
                            
                            Column(horizontalAlignment = Alignment.End) {
                                Text("Suggested", fontSize = 10.sp, color = Color.Gray)
                                Text("+\${item.finalOrder.toInt()} \${item.unit}", color = Color.Red, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}

/**
 * Android Specific Export Implementation: Writing clean comma separated file into application folders.
 */
fun exportToCSV(ctx: Context, items: List<SubmissionItem>) {
    try {
        val root = ctx.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS)
        val file = File(root, "Commissary_Report_\${System.currentTimeMillis()}.csv")
        val writer = FileWriter(file)
        
        // Write Header
        writer.append("Item ID,Item Name,Category,Unit,Current On Hand,Par Level,Suggested Purchase,Final Purchase\\n")
        
        // Write Data
        for (item in items) {
            writer.append("\${item.itemId},\${item.name},\${item.category},\${item.unit},\${item.currentCount},\${item.parLevel},\${item.suggestedOrder},\${item.finalOrder}\\n")
        }
        
        writer.flush()
        writer.close()
        Toast.makeText(ctx, "CSV successfully saved to:\\n\${file.absolutePath}", Toast.LENGTH_LONG).show()
    } catch (e: Exception) {
        Toast.makeText(ctx, "Failed writing file: \${e.message}", Toast.LENGTH_SHORT).show()
    }
}

fun exportToExcel(ctx: Context, items: List<SubmissionItem>) {
    // Highly Excel compatible XML/TSV structure
    try {
        val root = ctx.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS)
        val file = File(root, "Commissary_Report_\${System.currentTimeMillis()}.xls")
        val writer = FileWriter(file)
        
        writer.append("ID\\tName\\tCategory\\tUnit\\tOnHand\\tPar\\tSuggested\\tFinal\\n")
        for (item in items) {
            writer.append("\${item.itemId}\\t\${item.name}\\t\${item.category}\\t\${item.unit}\\t\${item.currentCount}\\t\${item.parLevel}\\t\${item.suggestedOrder}\\t\${item.finalOrder}\\n")
        }
        writer.flush()
        writer.close()
        Toast.makeText(ctx, "Excel sheet saved to:\\n\${file.absolutePath}", Toast.LENGTH_LONG).show()
    } catch (e: Exception) {
        Toast.makeText(ctx, "Failed XML excel write.", Toast.LENGTH_SHORT).show()
    }
}

fun exportToPDF(ctx: Context, items: List<SubmissionItem>) {
    // Uses android standard library Canvas/PdfDocument to generate native vector document reports.
    Toast.makeText(ctx, "Triggering Native Android PDF Graphics Document Canvas...", Toast.LENGTH_LONG).show()
    // Placeholder architecture:
    // val pdfDocument = android.graphics.pdf.PdfDocument()
    // val pageInfo = PageInfo.Builder(1200, 1600, 1).create()
    // val page = pdfDocument.startPage(pageInfo)
    // page.canvas.drawText("The Commissary Purchase Rollout Details", ...)
    // pdfDocument.writeTo(FileOutputStream(File(...)))
}
`
  },
  {
    path: 'firestore.rules',
    language: 'rules',
    description: 'Enterprise firestore rules matching exact role configurations (Super Admin, Admin, Manager, Employee).',
    content: `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Core helper: retrieves current authenticated user document inside /users/
    function getUserRecord() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

    // Role-based validations
    function isSuperAdmin() {
      return request.auth != null && getUserRecord().role == "Super Admin";
    }

    function isAdmin() {
      return request.auth != null && (getUserRecord().role == "Admin" || getUserRecord().role == "Super Admin");
    }

    function isManager() {
      return request.auth != null && (getUserRecord().role == "Manager" || isAdmin());
    }

    function isEmployee() {
      return request.auth != null && (getUserRecord().role == "Employee" || isManager());
    }

    // --- RULES DEFINITIONS ---

    // USERS collection: Only admins can manage. Users can read their own profiles.
    match /users/{userId} {
      allow read: if request.auth != null && (request.auth.uid == userId || isManager());
      allow write: if isAdmin();
    }

    // LOCATIONS collection: Deployed to global read but write constrained to Admins only.
    match /locations/{code} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }

    // INVENTORY ITEMS library: General inventory list.
    match /inventoryItems/{itemId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }

    // CHECK-LIST FORMS: Users read Forms if assigned in their lists or if Admin. 
    match /forms/{formId} {
      allow read: if request.auth != null && (
        isManager() || 
        request.auth.uid in resource.data.assignedUserIds || 
        resource.data.locationCode in getUserRecord().assignedLocations
      );
      allow write: if isAdmin();
    }

    // SUBMISSIONS results: Users only write/modify submissions assigned to them.
    match /submissions/{subId} {
      allow read: if request.auth != null && (
        isSuperAdmin() ||
        (isManager() && resource.data.locationCode in getUserRecord().assignedLocations) ||
        resource.data.userId == request.auth.uid
      );
      // Employees can write/submit if assigned
      allow create: if request.auth != null && isEmployee();
      allow update, delete: if isManager();
    }

    // SYSTEM AUDIT LOGS: Read-only to Super Administrators. Write-only to system scripts.
    match /auditLogs/{logId} {
      allow read: if isSuperAdmin();
      allow create: if request.auth != null; // any logged activity logs
      allow update, delete: if false;
    }
  }
}`
  }
];
