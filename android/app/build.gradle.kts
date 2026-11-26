import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.google.services)
}

// Claves públicas del proyecto (anon key de Supabase): salen de android/snappy.properties, que no se sube a GitHub.
val snappyProps = Properties().apply {
    val f = rootProject.file("snappy.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}

// Firma de publicación (Google Play): sale de snappy-signing.properties + keystore/, que no se suben a GitHub.
val signingProps = Properties().apply {
    val f = rootProject.file("snappy-signing.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}

android {
    namespace = "uno.snappy.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "uno.snappy.app"
        minSdk = 26
        targetSdk = 36
        versionCode = 12
        versionName = "0.1.10"

        buildConfigField("String", "SUPABASE_URL", "\"${snappyProps.getProperty("SUPABASE_URL", "")}\"")
        buildConfigField("String", "SUPABASE_ANON_KEY", "\"${snappyProps.getProperty("SUPABASE_ANON_KEY", "")}\"")
    }

    signingConfigs {
        if (signingProps.getProperty("STORE_FILE") != null) {
            create("release") {
                storeFile = rootProject.file(signingProps.getProperty("STORE_FILE"))
                storePassword = signingProps.getProperty("STORE_PASSWORD")
                keyAlias = signingProps.getProperty("KEY_ALIAS")
                keyPassword = signingProps.getProperty("KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            signingConfigs.findByName("release")?.let { signingConfig = it }
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
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
        buildConfig = true
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.navigation.compose)

    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.material3)
    implementation(libs.compose.material.icons)
    implementation(libs.compose.ui.tooling.preview)
    debugImplementation(libs.compose.ui.tooling)

    implementation(platform(libs.supabase.bom))
    implementation(libs.supabase.postgrest)
    implementation(libs.supabase.auth)
    implementation(libs.supabase.realtime)
    implementation(libs.supabase.storage)
    implementation(libs.androidx.exifinterface)
    implementation(libs.ktor.client.okhttp)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.kotlinx.coroutines.android)

    implementation(libs.coil.compose)

    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.messaging)
}
