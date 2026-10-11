
document.addEventListener("DOMContentLoaded", () => {
    const fincaSelect = document.getElementById("finca");
    const variedadSelect = document.getElementById("variedad");
    const semanaSelect = document.getElementById("semana");

    const SEMANAS = [39, 40, 41, 42, 43, 44, 45];
    // Factores de demostración obtenidos del comportamiento agregado del archivo de proyección.
    // No representan un modelo de IA validado.
    const FACTORES = {
        40: 1.0107,
        41: 0.9135,
        42: 0.8924,
        43: 0.9167,
        44: 0.9437,
        45: 0.9251
    };

    if (typeof datosProyeccion === "undefined") {
        document.body.insertAdjacentHTML("afterbegin", "<div style='padding:20px;background:#fee'>No se pudo cargar datos.js.</div>");
        return;
    }

    function unicos(datos, campo) {
        return [...new Set(datos.map(x => x[campo]).filter(v => v !== null && v !== undefined && v !== ""))]
            .sort((a,b) => String(a).localeCompare(String(b), "es", {numeric:true}));
    }

    function llenar(select, valores, inicial) {
        select.innerHTML = "";
        const op = document.createElement("option");
        op.value = ""; op.textContent = inicial; select.appendChild(op);
        valores.forEach(v => {
            const o = document.createElement("option");
            o.value = v; o.textContent = v; select.appendChild(o);
        });
    }

    function num(v) {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    }

    function formato(v) {
        return num(v).toLocaleString("es-CO");
    }

    function registrosSeleccionados() {
        const finca = fincaSelect.value;
        const variedad = variedadSelect.value;
        return datosProyeccion.filter(r =>
            String(r["FINCA"]) === String(finca) &&
            String(r["VARIEDAD COLIBRÍ"]) === String(variedad)
        );
    }

    function limpiar() {
        ["infoVariedad","infoProyeccion","infoProduccion","infoDiferencia","infoVariacion",
         "infoBloques","infoNaves","infoSupervisores"].forEach(id => {
            document.getElementById(id).textContent = id === "infoProduccion" || id === "infoDiferencia" || id === "infoVariacion" ? "Pendiente" : "-";
        });
        document.getElementById("tablaComparacion").innerHTML =
            '<tr><td colspan="2">Seleccione una finca y una variedad.</td></tr>';
        document.getElementById("tablaEstimacion").innerHTML =
            '<tr><td colspan="3">Seleccione una finca y una variedad.</td></tr>';
        document.getElementById("tablaUbicacion").innerHTML =
            '<tr><td colspan="5">Seleccione una finca y una variedad.</td></tr>';
        document.getElementById("mensajeEstimacion").textContent = "";
        document.getElementById("mensajeAnalisis").textContent =
            "Seleccione una finca y una variedad para consultar el análisis.";
    }

    llenar(fincaSelect, unicos(datosProyeccion, "FINCA"), "Seleccione una finca");

    fincaSelect.addEventListener("change", () => {
        llenar(variedadSelect, [], "Seleccione una variedad");
        llenar(semanaSelect, [], "Seleccione una semana");
        variedadSelect.disabled = true;
        semanaSelect.disabled = true;
        limpiar();

        if (!fincaSelect.value) return;

        const datosFinca = datosProyeccion.filter(r => String(r["FINCA"]) === fincaSelect.value);
        llenar(variedadSelect, unicos(datosFinca, "VARIEDAD COLIBRÍ"), "Seleccione una variedad");
        variedadSelect.disabled = false;
    });

    variedadSelect.addEventListener("change", () => {
        llenar(semanaSelect, [], "Seleccione una semana");
        semanaSelect.disabled = true;
        limpiar();

        if (!variedadSelect.value) return;

        llenar(semanaSelect, SEMANAS.map(String), "Seleccione una semana");
        semanaSelect.disabled = false;
        actualizar();
    });

    semanaSelect.addEventListener("change", actualizar);

    function actualizar() {
        if (!fincaSelect.value || !variedadSelect.value) return;

        const registros = registrosSeleccionados();
        const semana = semanaSelect.value ? Number(semanaSelect.value) : 39;

        document.getElementById("infoVariedad").textContent = variedadSelect.value;
        document.getElementById("infoProyeccion").textContent = formato(
            registros.reduce((s,r) => s + num(r[String(semana)]), 0)
        );
        document.getElementById("infoBloques").textContent = unicos(registros, "BL NUEVO").length;
        document.getElementById("infoNaves").textContent = unicos(registros, "NAVE NUEVA").length;
        document.getElementById("infoSupervisores").textContent = unicos(registros, "SUPERVISOR").length;

        mostrarComparacion(registros);
        mostrarEstimacion(registros);
        mostrarUbicacion(registros);
        mostrarAnalisis(registros, semana);
    }

    function mostrarComparacion(registros) {
        const tbody = document.getElementById("tablaComparacion");
        tbody.innerHTML = "";

        let total = 0;
        SEMANAS.slice(1).forEach(semana => {
            const valor = registros.reduce((s,r) => s + num(r[String(semana)]), 0);
            total += valor;
            tbody.innerHTML += `<tr><td>Semana ${semana}</td><td>${formato(valor)}</td></tr>`;
        });
        tbody.innerHTML += `<tr class="total"><td>TOTAL semanas 40–45</td><td>${formato(total)}</td></tr>`;
    }

    function mostrarEstimacion(registros) {
        const tbody = document.getElementById("tablaEstimacion");
        tbody.innerHTML = "";

        // La semana 39 combina el dato proyectado con el dato real histórico.
        // La estimación futura parte de la producción REAL de la semana 39,
        // porque ese es el historial observado que FLORAPRO utiliza como referencia.
        const proyeccion39 = registros.reduce((s,r) => s + num(r["39"]), 0);

        let real39 = 0;
        if (typeof produccionRealReporte !== "undefined") {
            const variedad = String(variedadSelect.value).toUpperCase();
            real39 = produccionRealReporte
                .filter(x => String(x["VARIEDAD"]).toUpperCase() === variedad)
                .reduce((s,x) => s + num(x["PRODUCCION_REAL"]), 0);
        }

        const baseHistorica = real39 > 0 ? real39 : proyeccion39;
        let estimado = baseHistorica;

        tbody.innerHTML += `
            <tr>
                <td>Semana 39</td>
                <td>${formato(proyeccion39)}</td>
                <td>${real39 > 0 ? "Producción real: " + formato(real39) : "Referencia histórica"}</td>
            </tr>`;

        for (let semana = 40; semana <= 45; semana++) {
            estimado = Math.max(0, Math.round(estimado * FACTORES[semana]));

            tbody.innerHTML += `
                <tr>
                    <td>Semana ${semana}</td>
                    <td>${formato(registros.reduce((s,r) => s + num(r[String(semana)]), 0))}</td>
                    <td>${formato(estimado)}</td>
                </tr>`;
        }

        document.getElementById("mensajeEstimacion").textContent =
            real39 > 0
            ? `FLORAPRO utiliza la producción real de la semana 39 (${formato(real39)} tallos) como punto de partida para estimar las semanas siguientes. A medida que se incorporen nuevos datos reales, las estimaciones podrán ajustarse con el historial acumulado.`
            : "La estimación es demostrativa para el prototipo académico. Los factores son provisionales y deberán sustituirse por un modelo validado cuando se disponga de suficientes datos históricos.";
    }

    function mostrarUbicacion(registros) {
        const tbody = document.getElementById("tablaUbicacion");
        tbody.innerHTML = "";
        const semana = semanaSelect.value ? semanaSelect.value : "39";
        let total = 0;

        registros.forEach(r => {
            const valor = num(r[semana]);
            total += valor;
            tbody.innerHTML += `
                <tr>
                    <td>${r["BL NUEVO"] ?? "-"}</td>
                    <td>${r["NAVE NUEVA"] ?? "-"}</td>
                    <td>${r["CAMAS"] ?? "-"}</td>
                    <td>${r["SUPERVISOR"] ?? "-"}</td>
                    <td>${formato(valor)}</td>
                </tr>`;
        });

        if (!registros.length) {
            tbody.innerHTML = '<tr><td colspan="5">No hay registros para la selección.</td></tr>';
            return;
        }

        tbody.innerHTML += `
            <tr class="total">
                <td colspan="4">TOTAL</td>
                <td>${formato(total)}</td>
            </tr>`;
    }

    function mostrarAnalisis(registros, semana) {
        const proy = registros.reduce((s,r) => s + num(r[String(semana)]), 0);
        const semanaSeleccionada = Number(semana);

        // Solo se compara contra producción real cuando existe producción
        // registrada para la semana seleccionada.
        let real = 0;
        let hayProduccionReal = false;

        // Por ahora, el reporte real disponible se utiliza como referencia
        // histórica de la semana 39. Las semanas futuras quedan pendientes
        // hasta incorporar su producción real.
        if (semanaSeleccionada === 39 && typeof produccionRealReporte !== "undefined") {
            const variedad = String(variedadSelect.value).toUpperCase();
            real = produccionRealReporte
                .filter(x => String(x["VARIEDAD"]).toUpperCase() === variedad)
                .reduce((s,x) => s + num(x["PRODUCCION_REAL"]), 0);
            hayProduccionReal = real > 0;
        }

        if (hayProduccionReal && proy > 0) {
            const diferencia = real - proy;
            const variacion = (diferencia / proy) * 100;

            document.getElementById("infoProduccion").textContent = formato(real);
            document.getElementById("infoDiferencia").textContent =
                (diferencia >= 0 ? "+" : "") + formato(diferencia);
            document.getElementById("infoVariacion").textContent =
                variacion.toFixed(1) + "%";

            document.getElementById("mensajeAnalisis").textContent =
                `Para ${variedadSelect.value}, la producción real registrada es ${formato(real)} tallos frente a ${formato(proy)} proyectados en la semana ${semanaSeleccionada}. La diferencia es ${diferencia >= 0 ? "+" : ""}${formato(diferencia)} tallos (${variacion.toFixed(1)}%).`;
        } else {
            document.getElementById("infoProduccion").textContent =
                "Sin producción registrada";
            document.getElementById("infoDiferencia").textContent = "—";
            document.getElementById("infoVariacion").textContent = "—";

            document.getElementById("mensajeAnalisis").textContent =
                `Para la semana ${semanaSeleccionada} todavía no hay producción real registrada. FLORAPRO mantiene la estimación y deja la comparación pendiente hasta incorporar el dato real de esa semana.`;
        }
    }
});
